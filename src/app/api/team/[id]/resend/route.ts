import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { sendTeamInviteEmail } from '@/lib/email';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can resend invitations.' }, { status: 403 });
  }

  const { id } = await params;

  try {
    let resetPassword = true; // Default to true so a temporary password is provided
    let updatedEmail = '';
    let updatedName = '';

    try {
      const body = await req.json();
      if (typeof body.resetPassword === 'boolean') {
        resetPassword = body.resetPassword;
      }
      if (body.email && typeof body.email === 'string') {
        updatedEmail = body.email.toLowerCase().trim();
      }
      if (body.name && typeof body.name === 'string') {
        updatedName = body.name.trim();
      }
    } catch {
      // Body is optional
    }

    const supabase = getAdminClient();

    // Verify membership exists within the caller's company
    const { data: membership } = await supabase
      .from('Membership')
      .select('*, user:User(id, name, email)')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!membership || !membership.user) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    let memberEmail = membership.user.email;
    let memberName = membership.user.name || memberEmail.split('@')[0];

    // If an updated email address was submitted (e.g. correcting a typo like jsmikle -> jsmilde)
    if (updatedEmail && updatedEmail !== memberEmail) {
      // Check if another existing user already has this email
      const { data: existingOtherUser } = await supabase
        .from('User')
        .select('id')
        .eq('email', updatedEmail)
        .neq('id', membership.user.id)
        .single();

      if (existingOtherUser) {
        return NextResponse.json({
          error: `Another user account with email "${updatedEmail}" already exists.`,
        }, { status: 400 });
      }

      await supabase
        .from('User')
        .update({
          email: updatedEmail,
          ...(updatedName ? { name: updatedName } : {}),
        })
        .eq('id', membership.user.id);

      memberEmail = updatedEmail;
      if (updatedName) memberName = updatedName;
    } else if (updatedName && updatedName !== memberName) {
      await supabase
        .from('User')
        .update({ name: updatedName })
        .eq('id', membership.user.id);
      memberName = updatedName;
    }

    // Fetch company name
    const { data: company } = await supabase
      .from('Company')
      .select('name')
      .eq('id', ctx.companyId)
      .single();

    const companyName = company?.name || 'Liable Alerts Workspace';

    // Dynamically retrieve the logged-in inviter's real details
    const { data: inviterUser } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', ctx.userId)
      .single();

    const senderEmail = inviterUser?.email || 'support@liablealerts.com';
    const senderName = inviterUser?.name?.trim() || senderEmail.split('@')[0] || 'Team Administrator';

    let newTempPassword = '';
    if (resetPassword) {
      newTempPassword = 'LA-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '!';
      const passwordHash = await bcrypt.hash(newTempPassword, 10);
      await supabase
        .from('User')
        .update({ passwordHash })
        .eq('id', membership.user.id);
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://app.liablealerts.com';
    const loginUrl = `${origin}/login?email=${encodeURIComponent(memberEmail)}`;

    const emailResult = await sendTeamInviteEmail({
      toEmail: memberEmail,
      senderName,
      senderEmail,
      companyName,
      role: membership.role,
      isNewUser: false,
      tempPassword: newTempPassword || undefined,
      isResend: true,
      loginUrl,
    });

    await auditLog(ctx, 'RESEND_TEAM_INVITE', 'Membership', membership.id, {
      memberEmail,
      senderEmail,
      senderName,
      resetPassword,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });

    if (!emailResult.success) {
      return NextResponse.json({
        error: emailResult.error || 'Failed to resend invitation email',
      }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      updatedEmail: memberEmail,
      updatedName: memberName,
      tempPassword: newTempPassword || undefined,
      messageId: emailResult.messageId,
      message: `Invitation successfully sent to ${memberEmail} from ${senderName} (${senderEmail}).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

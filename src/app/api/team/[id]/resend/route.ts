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
    let resetPassword = false;
    try {
      const body = await req.json();
      resetPassword = !!body.resetPassword;
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

    const memberEmail = membership.user.email;

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
      message: `Invitation successfully resent to ${memberEmail} from ${senderName} (${senderEmail}).`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

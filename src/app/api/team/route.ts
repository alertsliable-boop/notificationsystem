import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { sendTeamInviteEmail } from '@/lib/email';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'ADMIN', 'BILLING']).default('MEMBER'),
  resend: z.boolean().optional(),
  resetPassword: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can invite team members.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email: rawEmail, role, resend, resetPassword } = schema.parse(body);
    const email = rawEmail.toLowerCase().trim();

    const supabase = getAdminClient();

    // Fetch company name for email template
    const { data: company } = await supabase
      .from('Company')
      .select('name')
      .eq('id', ctx.companyId)
      .single();

    const companyName = company?.name || 'Liable Alerts Workspace';

    // Dynamically retrieve the logged-in inviter's details from the database
    const { data: inviterUser } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', ctx.userId)
      .single();

    const senderEmail = inviterUser?.email || 'support@liablealerts.com';
    const senderName = inviterUser?.name?.trim() || senderEmail.split('@')[0] || 'Team Administrator';

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://app.liablealerts.com';
    const loginUrl = `${origin}/login?email=${encodeURIComponent(email)}`;

    let { data: user } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

    // Check if user is already a member of this workspace
    if (user) {
      const { data: existingMembership } = await supabase
        .from('Membership')
        .select('*')
        .eq('userId', user.id)
        .eq('companyId', ctx.companyId)
        .single();

      if (existingMembership) {
        if (resend) {
          let newTempPassword = '';
          if (resetPassword) {
            newTempPassword = 'LA-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '!';
            const passwordHash = await bcrypt.hash(newTempPassword, 10);
            await supabase.from('User').update({ passwordHash }).eq('id', user.id);
          }

          const emailResult = await sendTeamInviteEmail({
            toEmail: email,
            senderName,
            senderEmail,
            companyName,
            role: existingMembership.role,
            isNewUser: false,
            tempPassword: newTempPassword || undefined,
            isResend: true,
            loginUrl,
          });

          await auditLog(ctx, 'RESEND_TEAM_INVITE', 'Membership', existingMembership.id, {
            email,
            senderEmail,
            emailSent: emailResult.success,
            emailError: emailResult.error,
          });

          return NextResponse.json({
            success: true,
            emailSent: emailResult.success,
            message: emailResult.success
              ? `Invitation successfully resent to ${email} from ${senderName} (${senderEmail}).`
              : `Member exists, but email delivery issue: ${emailResult.error}`,
          });
        }

        return NextResponse.json({
          error: 'This user is already a member of this workspace team.',
          isExisting: true,
          membershipId: existingMembership.id,
          userEmail: email,
        }, { status: 409 });
      }
    }

    let isNewUser = false;
    let tempPassword = '';

    if (!user) {
      isNewUser = true;
      tempPassword = 'LA-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '!';
      const passwordHash = await bcrypt.hash(tempPassword, 10);

      const { data: newUser, error: createError } = await supabase
        .from('User')
        .insert({
          email,
          name: email.split('@')[0],
          passwordHash,
        })
        .select()
        .single();

      if (createError || !newUser) {
        throw new Error(createError?.message || 'Failed to create user record');
      }
      user = newUser;
    }

    const { data: membership, error: memError } = await supabase
      .from('Membership')
      .insert({
        userId: user.id,
        companyId: ctx.companyId,
        role,
      })
      .select()
      .single();

    if (memError || !membership) {
      throw new Error(memError?.message || 'Failed to create team membership');
    }

    // Send invitation email via Resend
    const emailResult = await sendTeamInviteEmail({
      toEmail: email,
      senderName,
      senderEmail,
      companyName,
      role,
      isNewUser,
      tempPassword: tempPassword || undefined,
      isResend: false,
      loginUrl,
    });

    await auditLog(ctx, 'INVITE_TEAM_MEMBER', 'Membership', membership.id, {
      email,
      role,
      senderEmail,
      senderName,
      emailSent: emailResult.success,
      emailError: emailResult.error,
    });

    return NextResponse.json({
      data: membership,
      emailSent: emailResult.success,
      message: emailResult.success
        ? `Invitation email successfully sent to ${email} from ${senderName} (${senderEmail}).`
        : `Team member added. Email notification status: ${emailResult.error || 'pending'}.`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

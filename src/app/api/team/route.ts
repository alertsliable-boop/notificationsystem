import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const schema = z.object({
  email: z.string().email(),
  role: z.enum(['MEMBER', 'ADMIN', 'BILLING']).default('MEMBER'),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can invite team members.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { email: rawEmail, role } = schema.parse(body);
    const email = rawEmail.toLowerCase().trim();

    const supabase = getAdminClient();

    // Fetch company name for email template
    const { data: company } = await supabase
      .from('Company')
      .select('name')
      .eq('id', ctx.companyId)
      .single();

    const companyName = company?.name || 'Liable Alerts Workspace';

    let isNewUser = false;
    let tempPassword = '';

    let { data: user } = await supabase
      .from('User')
      .select('*')
      .eq('email', email)
      .single();

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

    const { data: existingMembership } = await supabase
      .from('Membership')
      .select('*')
      .eq('userId', user.id)
      .eq('companyId', ctx.companyId)
      .single();

    if (existingMembership) {
      return NextResponse.json({ error: 'This user is already a member of this workspace team' }, { status: 400 });
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

    // Send Invitation Email via Resend
    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://app.liablealerts.com';
    const loginUrl = `${origin}/login?email=${encodeURIComponent(email)}`;
    const senderName = 'Mauricio Arias';
    const senderEmail = 'cariasm@live.com';
    const fromAddress = `${senderName} <cariasm@alerts.liablealerts.com>`;

    let emailSent = false;
    let emailError = null;

    const resendApiKey = process.env.RESEND_API_KEY || Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');
    if (resendApiKey) {
      try {
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 40px 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #eaeaea; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #2563eb; border-radius: 12px; color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px; }
    .role-pill { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #1d4ed8; border-radius: 9999px; font-weight: 600; font-size: 12px; }
    .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 20px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 10px; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">⚡</div>
    <h1>You're invited to join ${companyName}</h1>
    <p>
      <strong>${senderName}</strong> (<a href="mailto:${senderEmail}" style="color: #2563eb;">${senderEmail}</a>) has invited you to join the <strong>${companyName}</strong> alert management workspace on <strong>Liable Alerts</strong> as a <span class="role-pill">${role}</span>.
    </p>

    ${isNewUser ? `
    <div class="cred-box">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e293b;">Your Temporary Account Credentials:</p>
      <p style="margin: 0 0 4px; font-size: 13px; color: #334155;"><strong>Email:</strong> ${email}</p>
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 14px;">${tempPassword}</code></p>
    </div>
    <p style="font-size: 13px; color: #64748b;">
      Click below to sign in. You can change your password anytime in your Account Settings.
    </p>
    ` : `
    <p style="font-size: 13px; color: #64748b;">
      You can access this workspace right away using your existing Liable Alerts credentials.
    </p>
    `}

    <div style="text-align: center; margin: 24px 0;">
      <a href="${loginUrl}" class="btn">Sign In to Workspace →</a>
    </div>

    <div class="footer">
      If you have questions, reply directly to this email at <a href="mailto:${senderEmail}" style="color: #64748b;">${senderEmail}</a>.<br>
      © ${new Date().getFullYear()} Liable Alerts. All rights reserved.
    </div>
  </div>
</body>
</html>
        `;

        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            reply_to: senderEmail,
            to: email,
            subject: `Invitation to join ${companyName} on Liable Alerts`,
            html,
          }),
        });

        const resendData = await resendRes.json();
        if (resendRes.ok) {
          emailSent = true;
        } else {
          console.error('[Team Invite Email Error]', resendData);
          emailError = resendData.message || 'Failed to send invite email';
        }
      } catch (err: any) {
        console.error('[Team Invite Email Exception]', err);
        emailError = err.message;
      }
    }

    await auditLog(ctx, 'INVITE_TEAM_MEMBER', 'Membership', membership.id, {
      email,
      role,
      emailSent,
      emailError,
    });

    return NextResponse.json({
      data: membership,
      emailSent,
      message: emailSent
        ? `Invitation email successfully sent to ${email}. Please have the newly invited member check their junk mail or spam folder.`
        : `Team member added. Email notification status: ${emailError || 'pending'}. Please have them check their junk mail or spam folder once delivered.`,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

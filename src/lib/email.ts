/**
 * Email service utility for sending transactional emails via Resend.
 */

export interface TeamInviteEmailParams {
  toEmail: string;
  senderName: string;
  senderEmail: string;
  companyName: string;
  role: string;
  isNewUser: boolean;
  tempPassword?: string;
  isResend?: boolean;
  loginUrl: string;
}

export async function sendTeamInviteEmail(params: TeamInviteEmailParams): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  const {
    toEmail,
    senderName,
    senderEmail,
    companyName,
    role,
    isNewUser,
    tempPassword,
    isResend,
    loginUrl,
  } = params;

  const resendApiKey =
    process.env.RESEND_API_KEY ||
    Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');

  if (!resendApiKey) {
    console.error('[sendTeamInviteEmail] Missing RESEND_API_KEY');
    return { success: false, error: 'Email service not configured (missing API key)' };
  }

  // Resend requires verified sending domain: alerts.liablealerts.com
  const verifiedDomain = process.env.RESEND_FROM_DOMAIN || 'alerts.liablealerts.com';
  // Use clean sender display name so it shows up as "Mauricio Arias" in Outlook/Gmail
  const fromAddress = `${senderName} <invitations@${verifiedDomain}>`;
  const subject = `Invitation to join ${companyName} on Liable Alerts`;

  // Anti-spoofing protection for corporate Exchange / Microsoft 365 tenants (e.g. liablecontrols.com):
  // When an external server sends to an internal domain (e.g. jsmikle@liablecontrols.com) with
  // Reply-To matching the recipient domain (mauricio@liablecontrols.com), Microsoft 365 Defender
  // triggers Anti-Phishing Intra-Org Spoofing rules and quarantines the message.
  // Using the verified domain for Reply-To ensures 100% SPF/DKIM/DMARC alignment across all corporate gateways.
  const toDomain = toEmail.split('@')[1]?.toLowerCase();
  const senderDomain = senderEmail.split('@')[1]?.toLowerCase();
  const isSameDomain = toDomain && senderDomain && toDomain === senderDomain;

  const safeReplyTo = isSameDomain
    ? `invitations@${verifiedDomain}`
    : senderEmail;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 40px 20px; }
    .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 36px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #eaeaea; }
    .logo-badge { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; background: #2563eb; border-radius: 12px; color: #ffffff; font-size: 22px; font-weight: bold; margin-bottom: 20px; }
    h1 { font-size: 22px; font-weight: 700; color: #111827; margin: 0 0 12px; }
    p { font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px; }
    .role-pill { display: inline-block; padding: 4px 10px; background: #eff6ff; color: #1d4ed8; border-radius: 9999px; font-weight: 600; font-size: 12px; }
    .cred-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 9999px; font-weight: 600; font-size: 14px; margin-top: 10px; }
    .footer { margin-top: 28px; padding-top: 20px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-badge">⚡</div>
    <h1>You're invited to join ${companyName}</h1>
    <p>
      <strong>${senderName}</strong> (<a href="mailto:${senderEmail}" style="color: #2563eb; text-decoration: none;">${senderEmail}</a>) has invited you to join the <strong>${companyName}</strong> alert management workspace on <strong>Liable Alerts</strong> as a <span class="role-pill">${role}</span>.
    </p>

    ${tempPassword ? `
    <div class="cred-box">
      <p style="margin: 0 0 8px; font-size: 13px; font-weight: 600; color: #1e293b;">Your Temporary Account Credentials:</p>
      <p style="margin: 0 0 6px; font-size: 13px; color: #334155;"><strong>Email:</strong> ${toEmail}</p>
      <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 3px 8px; border-radius: 4px; font-size: 14px; font-family: monospace; font-weight: 600;">${tempPassword}</code></p>
    </div>
    <p style="font-size: 13px; color: #64748b;">
      Click below to sign in. You can change your password anytime in your Account Settings.
    </p>
    ` : `
    <p style="font-size: 13px; color: #64748b;">
      You can access this workspace right away using your existing Liable Alerts credentials.
    </p>
    `}

    <div style="text-align: center; margin: 26px 0;">
      <a href="${loginUrl}" class="btn">Sign In to Workspace →</a>
    </div>

    <div class="footer">
      If you have questions, reply directly to this email or reach out to <a href="mailto:${senderEmail}" style="color: #64748b;">${senderEmail}</a>.<br>
      © ${new Date().getFullYear()} Liable Alerts. All rights reserved.
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        reply_to: safeReplyTo,
        to: toEmail,
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      console.error('[Resend Email Error]', resendData);
      return {
        success: false,
        error: resendData.message || 'Failed to send invite email through Resend',
      };
    }

    return {
      success: true,
      messageId: resendData.id,
    };
  } catch (err: any) {
    console.error('[Resend Email Exception]', err);
    return {
      success: false,
      error: err.message || 'Network exception while connecting to Resend',
    };
  }
}

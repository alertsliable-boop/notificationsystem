import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { processInboundEmail } from '@/services/endpointService';

export const runtime = 'nodejs'; // ensure Node runtime for crypto

function verifySvixSignature(
  rawBody: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  secret: string
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature || !secret) return false;
  try {
    const cleanSecret = secret.startsWith('whsec_') ? secret.slice(6) : secret;
    const secretBytes = Buffer.from(cleanSecret, 'base64');
    const toSign = `${svixId}.${svixTimestamp}.${rawBody}`;
    const expectedSig = crypto.createHmac('sha256', secretBytes).update(toSign).digest('base64');

    const sigParts = svixSignature.split(' ');
    for (const part of sigParts) {
      const [version, signature] = part.split(',');
      if (version === 'v1' && signature === expectedSig) {
        return true;
      }
    }
  } catch (err) {
    console.error('[INBOUND WEBHOOK] Svix verification error:', err);
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    // 1. Authenticate request: check URL ?secret= OR Svix header signature (Resend whsec_...)
    const { searchParams } = new URL(req.url);
    const querySecret = process.env.INBOUND_WEBHOOK_SECRET || process.env.SG_PARSE_SECRET;
    const isQuerySecretValid = querySecret && searchParams.get('secret') === querySecret;

    const svixId = req.headers.get('svix-id');
    const svixTimestamp = req.headers.get('svix-timestamp');
    const svixSignature = req.headers.get('svix-signature');
    const resendWebhookSecret = process.env.RESEND_WEBHOOK_SECRET;

    const isSvixValid = resendWebhookSecret
      ? verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, resendWebhookSecret)
      : false;

    if (!isQuerySecretValid && !isSvixValid) {
      console.warn('[INBOUND WEBHOOK] Unauthorized request — invalid secret and signature');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Parse JSON payload from Resend
    // Resend webhook format: { type: 'email.received', data: { to, from, subject, text, html, headers, ... } }
    const payload = JSON.parse(rawBody);
    
    // Fallback to top-level object if it's not wrapped in a Resend "email.received" event wrapper
    let emailData = payload;
    if (payload.type === 'email.received' && payload.data) {
       emailData = payload.data;
    }

    // Safely extract the 'to' address (Resend provides an array for 'to')
    const toAddress = Array.isArray(emailData.to) ? emailData.to[0] : (emailData.to || '');
    const emailId = emailData.email_id || emailData.id;
    let text = emailData.text || '';
    let html = emailData.html || '';
    let headers = emailData.headers || {};

    // Resend email.received webhook sends metadata only. Fetch full body if email_id is present and text is missing
    if (emailId && !text && !html) {
      const resendApiKey = process.env.RESEND_API_KEY;
      if (resendApiKey) {
        try {
          const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: {
              'Authorization': `Bearer ${resendApiKey}`
            }
          });
          if (res.ok) {
            const fullEmail = await res.json();
            text = fullEmail.text || '';
            html = fullEmail.html || '';
            headers = fullEmail.headers || headers;
          } else {
            console.warn(`[INBOUND WEBHOOK] Resend API returned ${res.status} when fetching email ${emailId}`);
          }
        } catch (fetchErr) {
          console.error('[INBOUND WEBHOOK] Error fetching full email from Resend:', fetchErr);
        }
      }
    }

    const messageId = headers?.['Message-ID'] || headers?.['message-id'] || emailData.message_id || '';

    // Map to the flat Record<string, string> that the existing processInboundEmail service expects
    const entries: Record<string, string> = {
      to: toAddress,
      from: emailData.from || '',
      subject: emailData.subject || '',
      text: text,
      html: html,
      headers: typeof headers === 'string' ? headers : JSON.stringify(headers || {}),
      'Message-ID': messageId,
      attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : ''
    };

    // 3. Acknowledge immediately, process async-friendly
    // In Vercel serverless we MUST await the promise before returning, or it gets killed
    try {
      await processInboundEmail(entries);
    } catch (err) {
      console.error('[INBOUND WEBHOOK] Processing error:', err);
    }

    // 4. Fast acknowledge to Resend (prevents retry)
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[INBOUND WEBHOOK] Fatal error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

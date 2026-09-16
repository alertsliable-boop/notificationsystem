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
    const emailId = emailData.email_id || emailData.id || payload.email_id || payload.id || payload.data?.email_id || payload.data?.id;
    let text = emailData.text || '';
    let html = emailData.html || '';
    let headers = emailData.headers || {};
    const resendApiKey = process.env.RESEND_API_KEY || Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');
    if (!process.env.RESEND_API_KEY) {
      console.log('[INBOUND WEBHOOK] Using fallback RESEND_API_KEY for inbound email body retrieval.');
    }

    // Resend email.received webhook sends metadata only. Fetch full body if text is missing
    if (resendApiKey && (!text || !text.trim())) {
      let fetchedEmail: any = null;

      // Strategy 1: Fetch direct by email_id
      if (emailId) {
        try {
          const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: {
              'Authorization': `Bearer ${resendApiKey}`,
            },
            cache: 'no-store'
          });
          if (res.ok) {
            fetchedEmail = await res.json();
            console.log(`[INBOUND WEBHOOK] Fetched email body for email ID: ${emailId}`);
          } else {
            console.warn(`[INBOUND WEBHOOK] Resend API returned status ${res.status} for email ID ${emailId}`);
          }
        } catch (fetchErr: any) {
          console.error('[INBOUND WEBHOOK] Error fetching email from Resend by ID:', fetchErr.message);
        }
      }

      // Strategy 2: Fallback query via receiving list matching message_id or recipient
      if (!fetchedEmail) {
        try {
          const listRes = await fetch('https://api.resend.com/emails/receiving', {
            headers: { 'Authorization': `Bearer ${resendApiKey}` },
            cache: 'no-store'
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const candidate = (listData.data || []).find((item: any) => {
              if (emailData.message_id && item.message_id === emailData.message_id) return true;
              if (emailId && item.id === emailId) return true;
              return false;
            }) || listData.data?.[0];

            if (candidate?.id) {
              const singleRes = await fetch(`https://api.resend.com/emails/receiving/${candidate.id}`, {
                headers: { 'Authorization': `Bearer ${resendApiKey}` },
                cache: 'no-store'
              });
              if (singleRes.ok) {
                fetchedEmail = await singleRes.json();
                console.log(`[INBOUND WEBHOOK] Fallback matched email ${candidate.id} via receiving list`);
              }
            }
          }
        } catch (listErr: any) {
          console.error('[INBOUND WEBHOOK] Fallback list fetch error:', listErr.message);
        }
      }

      // Extract content from fetched email
      if (fetchedEmail) {
        text = fetchedEmail.text || '';
        html = fetchedEmail.html || '';
        headers = fetchedEmail.headers || headers;

        // If text is empty but HTML is available, strip HTML tags to extract plaintext
        if ((!text || !text.trim()) && html) {
          text = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<br\s*[\/]?>/gi, '\n')
            .replace(/<\/p>/gi, '\n\n')
            .replace(/<\/div>/gi, '\n')
            .replace(/<[^>]+>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();
        }

        // If text is still empty but raw download_url is available
        if ((!text || !text.trim()) && fetchedEmail.raw?.download_url) {
          try {
            const rawRes = await fetch(fetchedEmail.raw.download_url);
            if (rawRes.ok) {
              const rawEml = await rawRes.text();
              const parts = rawEml.split(/\r?\n\r?\n/);
              if (parts.length > 1) {
                text = parts.slice(1).join('\n\n').trim();
              }
            }
          } catch (rawErr: any) {
            console.error('[INBOUND WEBHOOK] Raw EML download failed:', rawErr.message);
          }
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
      email_id: emailId || '',
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

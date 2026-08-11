import { NextResponse } from 'next/server';
import { processInboundEmail } from '@/services/endpointService';

export const runtime = 'nodejs'; // ensure Node runtime for crypto

export async function POST(req: Request) {
  try {
    // 1. Authenticate request with shared secret
    const { searchParams } = new URL(req.url);
    // Support either the old SG secret or the new INBOUND_WEBHOOK_SECRET
    const secret = process.env.INBOUND_WEBHOOK_SECRET || process.env.SG_PARSE_SECRET;
    if (searchParams.get('secret') !== secret) {
      console.warn('[INBOUND WEBHOOK] Unauthorized request — bad secret');
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. Parse JSON payload from Resend
    // Resend webhook format: { type: 'email.received', data: { to, from, subject, text, html, headers, ... } }
    const payload = await req.json();
    
    // Fallback to top-level object if it's not wrapped in a Resend "email.received" event wrapper
    let emailData = payload;
    if (payload.type === 'email.received' && payload.data) {
       emailData = payload.data;
    }

    // Safely extract the 'to' address (Resend provides an array for 'to')
    const toAddress = Array.isArray(emailData.to) ? emailData.to[0] : (emailData.to || '');
    const messageId = emailData.headers?.['Message-ID'] || emailData.headers?.['message-id'] || '';

    // Map to the flat Record<string, string> that the existing processInboundEmail service expects
    const entries: Record<string, string> = {
      to: toAddress,
      from: emailData.from || '',
      subject: emailData.subject || '',
      text: emailData.text || '',
      html: emailData.html || '',
      headers: JSON.stringify(emailData.headers || {}),
      'Message-ID': messageId,
      attachments: emailData.attachments ? JSON.stringify(emailData.attachments) : ''
    };

    // 3. Acknowledge immediately, process async-friendly
    // (In production this runs in Next.js Edge/Node — heavy work goes to the queue)
    processInboundEmail(entries).catch((err) => {
      console.error('[INBOUND WEBHOOK] Processing error:', err);
    });

    // 4. Fast acknowledge to Resend (prevents retry)
    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[INBOUND WEBHOOK] Fatal error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

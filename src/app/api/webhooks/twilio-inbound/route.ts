import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';
import { sendSms, validateTwilioSignature } from '@/lib/twilio';
import { nanoid } from 'nanoid';

/**
 * POST /api/webhooks/twilio-inbound
 *
 * Handles inbound SMS messages from Twilio Messaging Service.
 * Must be configured as the "Incoming Message" webhook URL in Twilio Console.
 *
 * Handles:
 *  YES         → confirm pending enrollment
 *  START/UNSTOP → re-enrollment after STOP (Twilio handles its own block list;
 *                 we just sync our application state)
 *  STOP/STOPALL → mark recipient OPTED_OUT immediately
 *  HELP        → auto-respond with service information
 *
 * Security: Validates Twilio request signature before processing.
 *
 * Idempotency: Uses WebhookEvent table keyed on MessageSid to prevent
 * double-processing if Twilio retries the webhook.
 */
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = Object.fromEntries(new URLSearchParams(rawBody));

    // ── 1. Validate Twilio signature ───────────────────────────────────────
    const signature = req.headers.get('x-twilio-signature') || '';
    const url = buildWebhookUrl(req);

    // Twilio signature validation uses auth token. API key auth cannot sign webhooks,
    // so TWILIO_AUTH_TOKEN must be set for webhook validation.
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (authToken && !authToken.includes('placeholder')) {
      const isValid = validateTwilioSignature(signature, url, params);
      if (!isValid) {
        console.warn('[TWILIO INBOUND] Invalid signature — rejecting webhook');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
      }
    } else {
      // Auth token not configured — log a warning but do not block in dev
      console.warn(
        '[TWILIO INBOUND] TWILIO_AUTH_TOKEN not configured — skipping signature validation. ' +
        'Set TWILIO_AUTH_TOKEN for production security.'
      );
    }

    const messageSid = params.MessageSid || '';
    const from = params.From || '';          // E.164 phone number
    const bodyRaw = (params.Body || '').trim();
    const bodyUpper = bodyRaw.toUpperCase();
    const optOutType = params.OptOutType || ''; // populated when Twilio Advanced Opt-Out fires

    if (!messageSid || !from) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // ── 2. Idempotency check ───────────────────────────────────────────────
    const { data: existingEvent } = await supabase
      .from('WebhookEvent')
      .select('id')
      .eq('idempotencyKey', messageSid)
      .single();

    if (existingEvent) {
      console.log(`[TWILIO INBOUND] Duplicate webhook ignored: ${messageSid}`);
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Record the webhook event (idempotency record)
    await supabase.from('WebhookEvent').insert({
      id: nanoid(),
      source: 'twilio_inbound',
      eventType: 'inbound_sms',
      payload: params as any,
      signatureValid: true,
      idempotencyKey: messageSid,
      processedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // ── 3. Find the recipient(s) by phone number ───────────────────────────
    // A phone number may be associated with multiple organizations.
    // We process all matches (STOP applies to all; YES applies to PENDING ones).
    const { data: recipients } = await supabase
      .from('PhoneRecipient')
      .select('*, company:Company(name)')
      .eq('phoneE164', from);

    const allRecipients = recipients || [];

    // ── 4. Route by keyword ────────────────────────────────────────────────

    // STOP keywords — opt out immediately
    if (
      ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'].includes(bodyUpper) ||
      optOutType === 'STOP'
    ) {
      await handleStop(supabase, allRecipients, from, messageSid, optOutType);
      // Return empty 200 — do NOT send a reply here if Twilio Advanced Opt-Out
      // is configured to auto-reply. If not using Advanced Opt-Out, we could
      // optionally send "You have been unsubscribed from Liable Alerts alerts."
      // but we leave that to Twilio's standard STOP handling.
      return new NextResponse(null, { status: 200 });
    }

    // START / UNSTOP keywords — re-enrollment
    if (['START', 'UNSTOP', 'YES'].includes(bodyUpper) || optOutType === 'START') {
      // YES is handled for pending enrollment; START/UNSTOP for re-enrollment
      if (bodyUpper === 'YES') {
        await handleYes(supabase, allRecipients, from, messageSid);
      } else {
        await handleStart(supabase, allRecipients, from, messageSid, optOutType);
      }
      return new NextResponse(null, { status: 200 });
    }

    // HELP keyword
    if (bodyUpper === 'HELP' || optOutType === 'HELP') {
      await handleHelp(supabase, allRecipients, from, messageSid);
      // Check if Twilio Advanced Opt-Out is handling HELP auto-reply.
      // If TWILIO_ADVANCED_OPT_OUT=true, do NOT send a duplicate.
      const advancedOptOut = process.env.TWILIO_ADVANCED_OPT_OUT === 'true';
      if (!advancedOptOut) {
        try {
          await sendSms({
            to: from,
            body:
              'Liable Alerts provides automated building and system alarm notifications on behalf of your service provider. ' +
              'For assistance, contact support@liablealerts.com. ' +
              'Reply STOP to unsubscribe. Message and data rates may apply.',
          });
        } catch (helpSmsErr: any) {
          console.error('[TWILIO INBOUND] Failed to send HELP response:', helpSmsErr.message);
        }
      }
      return new NextResponse(null, { status: 200 });
    }

    // Unknown keyword — log and ignore
    console.log(`[TWILIO INBOUND] Unrecognized keyword from ${from}: "${bodyRaw}"`);
    return new NextResponse(null, { status: 200 });

  } catch (err: any) {
    console.error('[TWILIO INBOUND] Unhandled error:', err.message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleStop(
  supabase: any,
  recipients: any[],
  fromPhone: string,
  messageSid: string,
  optOutType: string,
) {
  const now = new Date().toISOString();

  for (const r of recipients) {
    const prev = r.consentStatus || 'ACTIVE';
    await supabase
      .from('PhoneRecipient')
      .update({
        consentStatus: 'OPTED_OUT',
        optedOut: true,          // legacy field kept in sync
        optedOutAt: now,
        lastConsentEventAt: now,
      })
      .eq('id', r.id);

    await supabase.from('ConsentAuditLog').insert({
      id: nanoid(),
      companyId: r.companyId,
      recipientId: r.id,
      recipientPhone: fromPhone,
      recipientName: r.label,
      eventType: 'RECIPIENT_OPTED_OUT_STOP',
      previousStatus: prev,
      newStatus: 'OPTED_OUT',
      consentConfirmed: false,
      consentMethod: 'TWILIO_STOP',
      twilioMessageSid: messageSid,
      twilioOptOutType: optOutType || 'STOP',
      metadata: { source: 'twilio_inbound' },
      createdAt: now,
    });

    console.log(`[TWILIO INBOUND] STOP: Recipient ${r.id} (${fromPhone}) set to OPTED_OUT`);
  }

  // If no known recipient, still log the event
  if (recipients.length === 0) {
    console.log(`[TWILIO INBOUND] STOP received from unknown number ${fromPhone} — no action taken in app DB`);
  }
}

async function handleYes(
  supabase: any,
  recipients: any[],
  fromPhone: string,
  messageSid: string,
) {
  const now = new Date().toISOString();

  // Find PENDING recipients for this phone number
  const pending = recipients.filter((r) => r.consentStatus === 'PENDING');

  for (const r of pending) {
    await supabase
      .from('PhoneRecipient')
      .update({
        consentStatus: 'ACTIVE',
        optedOut: false,
        confirmedAt: now,
        consentMethod: 'DIRECT_SMS_YES',
        lastConsentEventAt: now,
      })
      .eq('id', r.id);

    await supabase.from('ConsentAuditLog').insert({
      id: nanoid(),
      companyId: r.companyId,
      recipientId: r.id,
      recipientPhone: fromPhone,
      recipientName: r.label,
      eventType: 'RECIPIENT_CONFIRMED_YES',
      previousStatus: 'PENDING',
      newStatus: 'ACTIVE',
      consentConfirmed: true,
      consentMethod: 'DIRECT_SMS_YES',
      twilioMessageSid: messageSid,
      metadata: { source: 'twilio_inbound' },
      createdAt: now,
    });

    console.log(`[TWILIO INBOUND] YES: Recipient ${r.id} (${fromPhone}) confirmed → ACTIVE`);
  }

  if (pending.length === 0) {
    // Could be a previously opted-out recipient trying to re-enroll — treat like START
    await handleStart(supabase, recipients, fromPhone, messageSid, '');
  }
}

async function handleStart(
  supabase: any,
  recipients: any[],
  fromPhone: string,
  messageSid: string,
  optOutType: string,
) {
  const now = new Date().toISOString();

  // Only re-activate OPTED_OUT recipients. Do not touch PENDING (they need YES).
  const optedOut = recipients.filter((r) => r.consentStatus === 'OPTED_OUT');

  for (const r of optedOut) {
    await supabase
      .from('PhoneRecipient')
      .update({
        consentStatus: 'ACTIVE',
        optedOut: false,
        lastConsentEventAt: now,
      })
      .eq('id', r.id);

    await supabase.from('ConsentAuditLog').insert({
      id: nanoid(),
      companyId: r.companyId,
      recipientId: r.id,
      recipientPhone: fromPhone,
      recipientName: r.label,
      eventType: 'RECIPIENT_REENROLLED_START',
      previousStatus: 'OPTED_OUT',
      newStatus: 'ACTIVE',
      consentConfirmed: true,
      consentMethod: 'TWILIO_START',
      twilioMessageSid: messageSid,
      twilioOptOutType: optOutType,
      metadata: { source: 'twilio_inbound' },
      createdAt: now,
    });

    console.log(`[TWILIO INBOUND] START: Recipient ${r.id} (${fromPhone}) re-enrolled → ACTIVE`);
  }
}

async function handleHelp(
  supabase: any,
  recipients: any[],
  fromPhone: string,
  messageSid: string,
) {
  const now = new Date().toISOString();

  for (const r of recipients) {
    await supabase.from('ConsentAuditLog').insert({
      id: nanoid(),
      companyId: r.companyId,
      recipientId: r.id,
      recipientPhone: fromPhone,
      recipientName: r.label,
      eventType: 'RECIPIENT_HELP_REQUEST',
      previousStatus: r.consentStatus,
      newStatus: r.consentStatus,
      consentConfirmed: false,
      twilioMessageSid: messageSid,
      metadata: { source: 'twilio_inbound' },
      createdAt: now,
    });
  }
}

// Build the full webhook URL for Twilio signature validation
function buildWebhookUrl(req: Request): string {
  const host = req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  const url = new URL(req.url);
  return `${proto}://${host}${url.pathname}`;
}

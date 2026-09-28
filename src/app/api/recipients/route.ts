import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { normalizePhoneE164, isValidPhoneE164 } from '@/lib/phone';
import { sendSms } from '@/lib/twilio';
import { nanoid } from 'nanoid';

// GET /api/recipients
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const { data: recipients } = await supabase
    .from('PhoneRecipient')
    .select('*, endpoints:EndpointRecipient(id, endpointId)')
    .eq('companyId', ctx.companyId)
    .order('label', { ascending: true });

  // Enrich with endpoint, site, and customer details
  const allEndpointsRes = await supabase
    .from('InboundEndpoint')
    .select('id, label, localPart, siteId, customerId, site:Site(id, name), customer:Customer(id, name)')
    .eq('companyId', ctx.companyId);

  const endpointMap = new Map<string, any>((allEndpointsRes.data || []).map((e: any) => [e.id, e]));

  const mappedRecipients = (recipients || []).map((r: any) => {
    const linkedEndpoints = (r.endpoints || [])
      .map((link: any) => endpointMap.get(link.endpointId))
      .filter(Boolean);

    const customers = Array.from(new Set(linkedEndpoints.map((e: any) => e.customer?.name).filter(Boolean)));
    const sites = Array.from(new Set(linkedEndpoints.map((e: any) => e.site?.name).filter(Boolean)));

    return {
      ...r,
      _count: { endpoints: linkedEndpoints.length },
      endpoints: linkedEndpoints,
      customerNames: customers,
      siteNames: sites,
    };
  });

  return NextResponse.json({ data: mappedRecipients });
}

// POST /api/recipients
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const {
      phoneE164: rawPhone,
      label,
      endpointId,
      consentCertified, // Required: account holder certifies consent was obtained
    } = await req.json();

    // Validate consent certification — required before creating an ACTIVE recipient
    if (!consentCertified) {
      return NextResponse.json(
        {
          error:
            'Consent certification is required. You must confirm that this recipient has expressly agreed to receive automated alarm text messages before adding them.',
        },
        { status: 400 }
      );
    }

    const normalized = normalizePhoneE164(rawPhone || '');
    if (!normalized || !isValidPhoneE164(normalized)) {
      return NextResponse.json(
        {
          error:
            'Invalid phone number. Use standard 10-digit format or E.164 (e.g. 305-753-7770 or +13057537770).',
        },
        { status: 400 }
      );
    }

    const supabase = getAdminClient();

    // Check for duplicate within company
    const { data: existing } = await supabase
      .from('PhoneRecipient')
      .select('*')
      .eq('companyId', ctx.companyId)
      .eq('phoneE164', normalized)
      .single();

    if (existing) {
      return NextResponse.json(
        {
          error: `This phone number (${normalized}) already exists${existing.label ? ` for "${existing.label}"` : ''}. Duplicate numbers cannot be added.`,
        },
        { status: 409 }
      );
    }

    // Capture IP for consent audit
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;

    // Get company name for enrollment SMS
    const { data: membership } = await supabase
      .from('Membership')
      .select('company:Company(name)')
      .eq('userId', ctx.userId)
      .eq('companyId', ctx.companyId)
      .single();

    const companyName = (membership?.company as any)?.name || 'Your Service Provider';

    // Create recipient with PENDING status — not active until they reply YES
    const now = new Date().toISOString();
    const { data: newRec, error: insertError } = await supabase
      .from('PhoneRecipient')
      .insert({
        companyId: ctx.companyId,
        phoneE164: normalized,
        label: label || normalized,
        // Consent state machine — starts PENDING
        consentStatus: 'PENDING',
        consentMethod: 'ACCOUNT_HOLDER_CERTIFIED',
        consentCertifiedAt: now,
        consentCertifiedBy: ctx.userId,
        lastConsentEventAt: now,
        // optedOut kept false (legacy field)
        optedOut: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;
    const recipient = newRec;

    // If endpointId was specified, link recipient to endpoint (with org validation)
    if (endpointId && recipient) {
      const { data: endpoint } = await supabase
        .from('InboundEndpoint')
        .select('id')
        .eq('id', endpointId)
        .eq('companyId', ctx.companyId)
        .single();

      if (endpoint) {
        const { data: existingLink } = await supabase
          .from('EndpointRecipient')
          .select('id')
          .eq('endpointId', endpointId)
          .eq('recipientId', recipient.id)
          .single();

        if (!existingLink) {
          await supabase
            .from('EndpointRecipient')
            .insert({ endpointId, recipientId: recipient.id });
        }
      }
    }

    // Record RECIPIENT_ADDED and CONSENT_CERTIFIED_BY_ACCOUNT_HOLDER in audit log
    const auditBase = {
      companyId: ctx.companyId,
      recipientId: recipient.id,
      recipientPhone: normalized,
      recipientName: label || normalized,
      userId: ctx.userId,
      endpointId: endpointId || null,
      ipAddress,
    };

    await supabase.from('ConsentAuditLog').insert([
      {
        id: nanoid(),
        ...auditBase,
        eventType: 'RECIPIENT_ADDED',
        previousStatus: null,
        newStatus: 'PENDING',
        consentConfirmed: false,
        createdAt: now,
      },
      {
        id: nanoid(),
        ...auditBase,
        eventType: 'CONSENT_CERTIFIED_BY_ACCOUNT_HOLDER',
        previousStatus: null,
        newStatus: 'PENDING',
        consentConfirmed: true,
        consentMethod: 'ACCOUNT_HOLDER_CERTIFIED',
        metadata: { certifiedByUserId: ctx.userId },
        createdAt: now,
      },
    ]);

    // Send enrollment SMS — recipient stays PENDING until they reply YES
    let enrollmentSmsSid: string | null = null;
    let enrollmentError: string | null = null;

    try {
      const enrollmentMessage =
        `Liable Alerts: ${companyName} has enrolled you to receive building and system alarm alerts. ` +
        `Reply YES to confirm. Message frequency varies. Msg & data rates may apply. ` +
        `Reply STOP to cancel or HELP for help.`;

      const smsResult = await sendSms({ to: normalized, body: enrollmentMessage });
      enrollmentSmsSid = smsResult.sid;

      // Update recipient with enrollment info
      await supabase
        .from('PhoneRecipient')
        .update({
          enrollmentSmsSid: smsResult.sid,
          enrollmentSentAt: new Date().toISOString(),
        })
        .eq('id', recipient.id);

      // Audit: enrollment SMS sent
      await supabase.from('ConsentAuditLog').insert({
        id: nanoid(),
        ...auditBase,
        eventType: 'ENROLLMENT_SMS_SENT',
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        consentConfirmed: false,
        twilioMessageSid: smsResult.sid,
        metadata: { status: smsResult.status },
        createdAt: new Date().toISOString(),
      });
    } catch (smsErr: any) {
      console.error('[RECIPIENTS] Failed to send enrollment SMS:', smsErr.message);
      enrollmentError = smsErr.message;
      // Do not fail the recipient creation — record the failure in audit
      await supabase.from('ConsentAuditLog').insert({
        id: nanoid(),
        ...auditBase,
        eventType: 'ENROLLMENT_SMS_FAILED',
        previousStatus: 'PENDING',
        newStatus: 'PENDING',
        consentConfirmed: false,
        metadata: { error: smsErr.message },
        createdAt: new Date().toISOString(),
      });
    }

    // Also record in main AuditLog
    await auditLog(ctx, 'CREATE_RECIPIENT', 'PhoneRecipient', recipient.id, {
      phoneE164: normalized,
      endpointId: endpointId || null,
      consentCertified: true,
      enrollmentSmsSent: !enrollmentError,
      enrollmentSmsSid,
    });

    return NextResponse.json(
      {
        data: { ...recipient, enrollmentSmsSid, enrollmentError },
        message:
          enrollmentError
            ? `Recipient added (PENDING). Enrollment SMS could not be sent: ${enrollmentError}. Please retry.`
            : 'Recipient added successfully. An enrollment SMS has been sent. The recipient must reply YES to become active.',
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { normalizePhoneE164, isValidPhoneE164 } from '@/lib/phone';

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
    const { phoneE164: rawPhone, label, endpointId } = await req.json();

    const normalized = normalizePhoneE164(rawPhone || '');
    if (!normalized || !isValidPhoneE164(normalized)) {
      return NextResponse.json({ error: 'Invalid phone number. Use standard 10-digit format or E.164 (e.g. 305-753-7770 or +13057537770).' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Check for duplicate within company
    let { data: existing } = await supabase
      .from('PhoneRecipient')
      .select('*')
      .eq('companyId', ctx.companyId)
      .eq('phoneE164', normalized)
      .single();

    let recipient = existing;

    if (!recipient) {
      const { data: newRec, error: insertError } = await supabase
        .from('PhoneRecipient')
        .insert({ companyId: ctx.companyId, phoneE164: normalized, label: label || normalized })
        .select()
        .single();

      if (insertError) throw insertError;
      recipient = newRec;
    } else if (label && (!existing.label || existing.label === existing.phoneE164)) {
      // Update label if previously bare
      await supabase
        .from('PhoneRecipient')
        .update({ label })
        .eq('id', existing.id);
      recipient.label = label;
    }

    // If endpointId was specified, link recipient to endpoint
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

    await auditLog(ctx, 'CREATE_RECIPIENT', 'PhoneRecipient', recipient.id, {
      phoneE164: normalized,
      endpointId: endpointId || null,
    });

    return NextResponse.json({ data: recipient }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}


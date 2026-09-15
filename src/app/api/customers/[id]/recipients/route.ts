import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { normalizePhoneE164, isValidPhoneE164 } from '@/lib/phone';

// GET /api/customers/[id]/recipients
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: customerId } = await params;
  const supabase = getAdminClient();

  // Verify customer belongs to company
  const { data: customer } = await supabase
    .from('Customer')
    .select('*, sites:Site(*)')
    .eq('id', customerId)
    .eq('companyId', ctx.companyId)
    .single();

  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });

  // Get all endpoints for this customer
  const { data: endpoints } = await supabase
    .from('InboundEndpoint')
    .select('id, label, localPart, status, siteId, site:Site(id, name), domain:Domain(hostname)')
    .eq('customerId', customerId)
    .eq('companyId', ctx.companyId);

  const endpointIds = (endpoints || []).map((e: any) => e.id);

  let recipientsWithEndpoints: any[] = [];

  if (endpointIds.length > 0) {
    const { data: links } = await supabase
      .from('EndpointRecipient')
      .select('id, endpointId, recipientId')
      .in('endpointId', endpointIds);

    const recIds = Array.from(new Set((links || []).map((l: any) => l.recipientId).filter(Boolean)));

    if (recIds.length > 0) {
      const { data: recs } = await supabase
        .from('PhoneRecipient')
        .select('*')
        .in('id', recIds);

      const endpointMap = new Map((endpoints || []).map((e: any) => [e.id, e]));
      const recMap = new Map((recs || []).map((r: any) => [r.id, r]));

      recipientsWithEndpoints = (links || []).map((link: any) => ({
        linkId: link.id,
        recipient: recMap.get(link.recipientId),
        endpoint: endpointMap.get(link.endpointId),
      })).filter((item: any) => item.recipient && item.endpoint);
    }
  }

  // Also fetch all company recipients for dropdown selection
  const { data: allCompanyRecipients } = await supabase
    .from('PhoneRecipient')
    .select('id, phoneE164, label, optedOut')
    .eq('companyId', ctx.companyId)
    .order('label', { ascending: true });

  return NextResponse.json({
    customer,
    endpoints: endpoints || [],
    recipients: recipientsWithEndpoints,
    availableRecipients: allCompanyRecipients || [],
  });
}

// POST /api/customers/[id]/recipients — Link existing or create new recipient for endpoint under this customer
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: customerId } = await params;
  const supabase = getAdminClient();

  try {
    const body = await req.json();
    const { endpointId, recipientId, phone, label } = body;

    // Get all endpoints for this customer
    const { data: customerEndpoints } = await supabase
      .from('InboundEndpoint')
      .select('id, label')
      .eq('customerId', customerId)
      .eq('companyId', ctx.companyId);

    if (!customerEndpoints || customerEndpoints.length === 0) {
      return NextResponse.json(
        { error: 'This customer has no email endpoints yet. Please create an email endpoint for this customer first.' },
        { status: 400 }
      );
    }

    const targetEndpointId = endpointId || customerEndpoints[0].id;

    // Verify endpoint belongs to this customer
    const validEndpoint = customerEndpoints.find((e: any) => e.id === targetEndpointId);
    if (!validEndpoint) {
      return NextResponse.json({ error: 'Endpoint does not belong to this customer' }, { status: 400 });
    }

    let targetRecipientId = recipientId;

    if (!targetRecipientId) {
      // Creating a new recipient
      const normalized = normalizePhoneE164(phone || '');
      if (!normalized || !isValidPhoneE164(normalized)) {
        return NextResponse.json({ error: 'Invalid phone number. Use standard 10-digit format or E.164 (e.g. 305-753-7770 or +13057537770).' }, { status: 400 });
      }

      // Check if already exists
      const { data: existing } = await supabase
        .from('PhoneRecipient')
        .select('id')
        .eq('companyId', ctx.companyId)
        .eq('phoneE164', normalized)
        .single();

      if (existing) {
        targetRecipientId = existing.id;
      } else {
        const { data: newRec, error: createError } = await supabase
          .from('PhoneRecipient')
          .insert({
            companyId: ctx.companyId,
            phoneE164: normalized,
            label: label || normalized,
          })
          .select()
          .single();

        if (createError) throw createError;
        targetRecipientId = newRec.id;
      }
    }

    // Link recipient to endpoint
    const { data: existingLink } = await supabase
      .from('EndpointRecipient')
      .select('id')
      .eq('endpointId', targetEndpointId)
      .eq('recipientId', targetRecipientId)
      .single();

    if (!existingLink) {
      await supabase
        .from('EndpointRecipient')
        .insert({
          endpointId: targetEndpointId,
          recipientId: targetRecipientId,
        });
    }

    await auditLog(ctx, 'ASSIGN_CUSTOMER_RECIPIENT', 'EndpointRecipient', targetEndpointId, {
      customerId,
      recipientId: targetRecipientId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error assigning customer recipient:', err);
    return NextResponse.json({ error: err.message || 'Failed to assign recipient' }, { status: 500 });
  }
}

// DELETE /api/customers/[id]/recipients — Remove recipient from endpoint under this customer
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: customerId } = await params;
  const { searchParams } = new URL(req.url, 'http://localhost');
  const endpointId = searchParams.get('endpointId');
  const recipientId = searchParams.get('recipientId');

  if (!endpointId || !recipientId) {
    return NextResponse.json({ error: 'endpointId and recipientId are required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Verify endpoint belongs to this customer
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('id')
    .eq('id', endpointId)
    .eq('customerId', customerId)
    .eq('companyId', ctx.companyId)
    .single();

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found for this customer' }, { status: 404 });
  }

  await supabase
    .from('EndpointRecipient')
    .delete()
    .eq('endpointId', endpointId)
    .eq('recipientId', recipientId);

  await auditLog(ctx, 'UNLINK_CUSTOMER_RECIPIENT', 'EndpointRecipient', endpointId, { customerId, recipientId });

  return NextResponse.json({ success: true });
}

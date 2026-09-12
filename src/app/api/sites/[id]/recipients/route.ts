import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { normalizePhoneE164, isValidPhoneE164 } from '@/lib/phone';

// GET /api/sites/[id]/recipients
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: siteId } = await params;
  const supabase = getAdminClient();

  // Verify site belongs to company
  const { data: site } = await supabase
    .from('Site')
    .select('*, customer:Customer(id, name)')
    .eq('id', siteId)
    .eq('companyId', ctx.companyId)
    .single();

  if (!site) return NextResponse.json({ error: 'Site not found' }, { status: 404 });

  // Get all endpoints for this site
  const { data: endpoints } = await supabase
    .from('InboundEndpoint')
    .select('id, label, localPart, status, domain:Domain(hostname)')
    .eq('siteId', siteId)
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
    site,
    endpoints: endpoints || [],
    recipients: recipientsWithEndpoints,
    availableRecipients: allCompanyRecipients || [],
  });
}

// POST /api/sites/[id]/recipients — Link existing or create new recipient for endpoint at this site
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: siteId } = await params;
  const supabase = getAdminClient();

  try {
    const body = await req.json();
    const { endpointId, recipientId, phone, label } = body;

    if (!endpointId) {
      return NextResponse.json({ error: 'Endpoint is required to assign a recipient to this site' }, { status: 400 });
    }

    // Verify endpoint belongs to this site and company
    const { data: endpoint } = await supabase
      .from('InboundEndpoint')
      .select('id, label')
      .eq('id', endpointId)
      .eq('siteId', siteId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found at this site' }, { status: 404 });
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
      .eq('endpointId', endpointId)
      .eq('recipientId', targetRecipientId)
      .single();

    if (!existingLink) {
      await supabase
        .from('EndpointRecipient')
        .insert({
          endpointId,
          recipientId: targetRecipientId,
        });
    }

    await auditLog(ctx, 'ASSIGN_SITE_RECIPIENT', 'EndpointRecipient', endpointId, {
      siteId,
      recipientId: targetRecipientId,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error assigning site recipient:', err);
    return NextResponse.json({ error: err.message || 'Failed to assign recipient' }, { status: 500 });
  }
}

// DELETE /api/sites/[id]/recipients — Remove recipient from endpoint at this site
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: siteId } = await params;
  const { searchParams } = new URL(req.url, 'http://localhost');
  const endpointId = searchParams.get('endpointId');
  const recipientId = searchParams.get('recipientId');

  if (!endpointId || !recipientId) {
    return NextResponse.json({ error: 'endpointId and recipientId are required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // Verify endpoint belongs to this site and company
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('id')
    .eq('id', endpointId)
    .eq('siteId', siteId)
    .eq('companyId', ctx.companyId)
    .single();

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found at this site' }, { status: 404 });
  }

  await supabase
    .from('EndpointRecipient')
    .delete()
    .eq('endpointId', endpointId)
    .eq('recipientId', recipientId);

  await auditLog(ctx, 'UNLINK_SITE_RECIPIENT', 'EndpointRecipient', endpointId, { siteId, recipientId });

  return NextResponse.json({ success: true });
}

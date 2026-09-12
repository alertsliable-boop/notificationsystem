import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

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

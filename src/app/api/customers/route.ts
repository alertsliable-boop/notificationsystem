import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  notes: z.string().max(500).optional(),
});

export const dynamic = 'force-dynamic';

// GET all customers for company
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const [{ data: customers }, { data: sites }, { data: endpoints }, { data: links }] = await Promise.all([
    supabase
      .from('Customer')
      .select('*')
      .eq('companyId', ctx.companyId)
      .order('name', { ascending: true }),
    supabase
      .from('Site')
      .select('id, customerId')
      .eq('companyId', ctx.companyId),
    supabase
      .from('InboundEndpoint')
      .select('id, customerId')
      .eq('companyId', ctx.companyId),
    supabase
      .from('EndpointRecipient')
      .select('endpointId, recipientId'),
  ]);

  // Count sites per customer
  const customerSitesCount = new Map<string, number>();
  (sites || []).forEach((s: any) => {
    if (s.customerId) {
      customerSitesCount.set(s.customerId, (customerSitesCount.get(s.customerId) || 0) + 1);
    }
  });

  // Map endpointId to customerId and count endpoints per customer
  const endpointCustomerMap = new Map<string, string>();
  const customerEndpointsCount = new Map<string, number>();
  (endpoints || []).forEach((ep: any) => {
    if (ep.customerId) {
      endpointCustomerMap.set(ep.id, ep.customerId);
      customerEndpointsCount.set(ep.customerId, (customerEndpointsCount.get(ep.customerId) || 0) + 1);
    }
  });

  // Map customerId to set of unique recipientIds
  const customerRecipientsMap = new Map<string, Set<string>>();
  (links || []).forEach((link: any) => {
    const customerId = endpointCustomerMap.get(link.endpointId);
    if (customerId && link.recipientId) {
      if (!customerRecipientsMap.has(customerId)) {
        customerRecipientsMap.set(customerId, new Set());
      }
      customerRecipientsMap.get(customerId)!.add(link.recipientId);
    }
  });

  const mappedCustomers = (customers || []).map((c: any) => {
    return {
      ...c,
      _count: {
        sites: customerSitesCount.get(c.id) || 0,
        endpoints: customerEndpointsCount.get(c.id) || 0,
        recipients: customerRecipientsMap.get(c.id)?.size || 0,
      },
    };
  });

  return NextResponse.json({ data: mappedCustomers });
}

// POST create customer
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const { name, notes } = customerSchema.parse(body);

    const supabase = getAdminClient();
    const { data: customer } = await supabase
      .from('Customer')
      .insert({ companyId: ctx.companyId, name, notes })
      .select()
      .single();

    if (!customer) throw new Error('Failed to create customer');

    await auditLog(ctx, 'CREATE_CUSTOMER', 'Customer', customer.id, { name });

    return NextResponse.json({ data: customer }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

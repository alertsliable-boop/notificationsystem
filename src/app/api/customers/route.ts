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
  const { data: customers } = await supabase
    .from('Customer')
    .select('*, sites:Site(id), endpoints:InboundEndpoint(id)')
    .eq('companyId', ctx.companyId)
    .order('name', { ascending: true });

  const mappedCustomers = (customers || []).map((c: any) => ({
    ...c,
    _count: {
      sites: c.sites?.length || 0,
      endpoints: c.endpoints?.length || 0
    }
  }));

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

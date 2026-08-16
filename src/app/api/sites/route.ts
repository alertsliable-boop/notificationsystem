import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const siteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().max(200).optional(),
  customerId: z.string().min(1, 'Customer is required'),
});

export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const { data: sites } = await supabase
    .from('Site')
    .select('*, customer:Customer(name), endpoints:InboundEndpoint(id)')
    .eq('companyId', ctx.companyId)
    .order('name', { ascending: true });

  const mappedSites = (sites || []).map((s: any) => ({
    ...s,
    _count: { endpoints: s.endpoints?.length || 0 }
  }));

  return NextResponse.json({ data: mappedSites });
}

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const { name, address, customerId } = siteSchema.parse(body);

    const supabase = getAdminClient();
    // Verify customer belongs to this company
    const { data: customer } = await supabase
      .from('Customer')
      .select('*')
      .eq('id', customerId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: site } = await supabase
      .from('Site')
      .insert({ companyId: ctx.companyId, customerId, name, address })
      .select()
      .single();

    if (!site) throw new Error('Failed to create site');

    await auditLog(ctx, 'CREATE_SITE', 'Site', site.id, { name, customerId });

    return NextResponse.json({ data: site }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

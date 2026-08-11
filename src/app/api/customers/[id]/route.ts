import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const customerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  notes: z.string().max(500).optional().nullable(),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, notes } = customerSchema.parse(body);

    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from('Customer')
      .select('*')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: customer } = await supabase
      .from('Customer')
      .update({ name, notes })
      .eq('id', id)
      .select()
      .single();

    if (!customer) throw new Error('Failed to update customer');

    await auditLog(ctx, 'UPDATE_CUSTOMER', 'Customer', customer.id, { name });

    return NextResponse.json({ data: customer }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  try {
    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from('Customer')
      .select('*')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('Customer')
      .delete()
      .eq('id', id);
      
    if (error) throw error;

    await auditLog(ctx, 'DELETE_CUSTOMER', 'Customer', id, { name: existing.name });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete customer. Ensure no endpoints are linked.' }, { status: 400 });
  }
}

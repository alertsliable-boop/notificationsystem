import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: recipient } = await supabase
    .from('PhoneRecipient')
    .select('*')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!recipient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Remove endpoint associations first
  await supabase.from('EndpointRecipient').delete().eq('recipientId', id);
  await supabase.from('PhoneRecipient').delete().eq('id', id);

  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: recipient } = await supabase
    .from('PhoneRecipient')
    .select('*')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!recipient) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { label, optedOut } = await req.json();

  const { data: updated } = await supabase
    .from('PhoneRecipient')
    .update({
      ...(label !== undefined && { label }),
      ...(optedOut !== undefined && { optedOut }),
    })
    .eq('id', id)
    .select()
    .single();

  return NextResponse.json({ data: updated });
}

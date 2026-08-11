import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// GET /api/endpoints/[id] — fetch full endpoint detail
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('*, domain:Domain(*), customer:Customer(*), site:Site(*), recipients:EndpointRecipient(recipient:PhoneRecipient(*))')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: endpoint });
}

// PATCH /api/endpoints/[id] — update label, notes, etc.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const schema = z.object({
    label: z.string().max(100).optional(),
    notes: z.string().max(500).optional(),
    severityTag: z.string().max(50).optional(),
  });

  try {
    const body = await req.json();
    const data = schema.parse(body);

    const supabase = getAdminClient();

    // Verify ownership
    const { data: endpoint } = await supabase
      .from('InboundEndpoint')
      .select('*')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: updated } = await supabase
      .from('InboundEndpoint')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    await auditLog(ctx, 'UPDATE_ENDPOINT', 'InboundEndpoint', id, data);
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE /api/endpoints/[id]
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('*')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!endpoint) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Soft-delete: just deactivate
  await supabase
    .from('InboundEndpoint')
    .update({ status: 'INACTIVE' })
    .eq('id', id);

  await auditLog(ctx, 'DEACTIVATE_ENDPOINT', 'InboundEndpoint', id);
  return NextResponse.json({ success: true });
}

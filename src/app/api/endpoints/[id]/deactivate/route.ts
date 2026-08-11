import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

// POST /api/endpoints/[id]/deactivate
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { data: updated } = await supabase
    .from('InboundEndpoint')
    .update({ status: 'INACTIVE' })
    .eq('id', id)
    .select()
    .single();

  await auditLog(ctx, 'DEACTIVATE_ENDPOINT', 'InboundEndpoint', id);
  return NextResponse.json({ data: updated });
}

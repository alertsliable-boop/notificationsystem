import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { activateEndpoint, PlanLimitExceededError } from '@/services/endpointService';
import { getAdminClient } from '@/lib/supabase';

// POST /api/endpoints/[id]/activate
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

  if (endpoint.status === 'ACTIVE') {
    return NextResponse.json({ data: endpoint });
  }

  try {
    const updated = await activateEndpoint(id, ctx.companyId);
    await auditLog(ctx, 'ACTIVATE_ENDPOINT', 'InboundEndpoint', id);
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof PlanLimitExceededError) {
      return NextResponse.json(
        { error: err.message, code: 'PLAN_LIMIT_EXCEEDED' },
        { status: 402 }
      );
    }
    throw err;
  }
}

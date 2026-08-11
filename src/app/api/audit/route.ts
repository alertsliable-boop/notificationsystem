import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '50');

  const supabase = getAdminClient();
  const { data: logs, count: total } = await supabase
    .from('AuditLog')
    .select('*', { count: 'exact' })
    .eq('companyId', ctx.companyId)
    .order('createdAt', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  return NextResponse.json({ data: logs, total, page, pageSize });
}

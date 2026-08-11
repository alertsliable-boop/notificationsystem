import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/notifications
export async function GET(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '20');
  const endpointId = searchParams.get('endpointId');

  const supabase = getAdminClient();
  let query = supabase
    .from('Notification')
    .select('*, endpoint:InboundEndpoint(label, localPart, domain:Domain(hostname)), smsMessages:SmsMessage(id, status, providerSid, recipientId)', { count: 'exact' })
    .eq('companyId', ctx.companyId)
    .order('receivedAt', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (endpointId) query = query.eq('endpointId', endpointId);

  const { data: notifications, count: total } = await query;

  return NextResponse.json({ data: notifications, total, page, pageSize });
}

import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id } = await params;

  const supabase = getAdminClient();
  const { data: notification } = await supabase
    .from('Notification')
    .select('*, endpoint:InboundEndpoint(label, localPart, domain:Domain(hostname), customer:Customer(id, name), site:Site(id, name)), payload:NotificationPayload(*), smsMessages:SmsMessage(*, events:SmsDeliveryEvent(*))')
    .eq('id', id)
    .eq('companyId', ctx.companyId)
    .single();

  if (!notification) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ data: notification });
}

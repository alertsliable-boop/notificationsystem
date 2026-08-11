import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET /api/dashboard/usage
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const last24h = new Date(Date.now() - 86400000).toISOString();
  
  const [
    { count: activeCount },
    { data: subscription },
    { count: last24hNotifs },
    { count: failedSms },
    { count: totalSms },
  ] = await Promise.all([
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', ctx.companyId).eq('status', 'ACTIVE'),
    supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)').eq('companyId', ctx.companyId).single(),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', ctx.companyId).gte('receivedAt', last24h),
    supabase.from('SmsMessage').select('*, notification!inner(companyId)', { count: 'exact', head: true }).eq('notification.companyId', ctx.companyId).in('status', ['FAILED', 'UNDELIVERED']),
    supabase.from('SmsMessage').select('*, notification!inner(companyId)', { count: 'exact', head: true }).eq('notification.companyId', ctx.companyId),
  ]);

  const deliveryRate = (totalSms || 0) > 0 ? Math.round((((totalSms || 0) - (failedSms || 0)) / (totalSms || 0)) * 100) : 100;

  return NextResponse.json({
    data: {
      activeEndpoints: activeCount || 0,
      maxEndpoints: subscription?.plan?.maxActiveEndpoints ?? 0,
      planName: subscription?.plan?.name ?? 'No Plan',
      planStatus: subscription?.status ?? 'ACTIVE',
      notificationsLast24h: last24hNotifs || 0,
      failedSmsCount: failedSms || 0,
      deliveryRatePercent: deliveryRate,
    },
  });
}

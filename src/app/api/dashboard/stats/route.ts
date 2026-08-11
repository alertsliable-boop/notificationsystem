import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getAdminClient();
  const { data: membership } = await supabase.from('Membership').select('*').eq('userId', session.user.id).single();
  if (!membership) return NextResponse.json({ error: 'No company' }, { status: 403 });

  const companyId = membership.companyId;
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Execute in parallel
  const [
    { count: activeEndpoints },
    { data: subscription },
    { count: notificationsToday },
    { count: notificationsMonth },
    { data: smsTodayData },
    { data: smsAllData },
  ] = await Promise.all([
    supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('companyId', companyId).eq('status', 'ACTIVE'),
    supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)').eq('companyId', companyId).single(),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', companyId).gte('receivedAt', startOfToday),
    supabase.from('Notification').select('*', { count: 'exact', head: true }).eq('companyId', companyId).gte('receivedAt', startOfMonth),
    supabase.from('SmsMessage').select('status, notification!inner(companyId)').eq('notification.companyId', companyId).gte('createdAt', startOfToday),
    supabase.from('SmsMessage').select('status, notification!inner(companyId)').eq('notification.companyId', companyId),
  ]);

  // Group by in memory
  const smsTodayStats = (smsTodayData || []).reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  
  const smsAllStats = (smsAllData || []).reduce((acc: any, curr: any) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const maxEndpoints = subscription?.plan?.maxActiveEndpoints ?? 0;
  const smsTodayTotal = Object.values(smsTodayStats).reduce((a: any, b: any) => a + b, 0) as number;
  const smsTotal = Object.values(smsAllStats).reduce((a: any, b: any) => a + b, 0) as number;
  const smsDelivered = smsAllStats['DELIVERED'] || 0;
  const deliveryRate = smsTotal > 0 ? Math.round((smsDelivered / smsTotal) * 100) : 100;

  return NextResponse.json({
    data: {
      activeEndpoints,
      maxEndpoints,
      usagePct: maxEndpoints > 0 ? Math.round(((activeEndpoints || 0) / maxEndpoints) * 100) : 0,
      notificationsToday,
      notificationsMonth,
      smsTodayTotal,
      smsTotal,
      smsDelivered,
      deliveryRate,
      planName: subscription?.plan?.name ?? 'N/A',
    },
  });
}

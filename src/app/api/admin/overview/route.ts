import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  const supabase = getAdminClient();

  try {
    const [
      { count: totalUsers },
      { count: totalCompanies },
      { count: totalEndpoints },
      { count: activeEndpoints },
      { count: totalRecipients },
      { count: totalNotifications },
      { data: smsData },
      { data: subscriptionsData },
      { data: plansData },
    ] = await Promise.all([
      supabase.from('User').select('*', { count: 'exact', head: true }),
      supabase.from('Company').select('*', { count: 'exact', head: true }),
      supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }),
      supabase.from('InboundEndpoint').select('*', { count: 'exact', head: true }).eq('status', 'ACTIVE'),
      supabase.from('PhoneRecipient').select('*', { count: 'exact', head: true }),
      supabase.from('Notification').select('*', { count: 'exact', head: true }),
      supabase.from('SmsMessage').select('status'),
      supabase.from('CompanySubscription').select('*, plan:SubscriptionPlan(*)'),
      supabase.from('SubscriptionPlan').select('*'),
    ]);

    // SMS Statistics
    const smsStatusCounts: Record<string, number> = {};
    (smsData || []).forEach((msg: any) => {
      smsStatusCounts[msg.status] = (smsStatusCounts[msg.status] || 0) + 1;
    });
    const totalSms = (smsData || []).length;
    const deliveredSms = smsStatusCounts['DELIVERED'] || 0;
    const failedSms = (smsStatusCounts['FAILED'] || 0) + (smsStatusCounts['UNDELIVERED'] || 0);
    const deliveryRate = totalSms > 0 ? Math.round((deliveredSms / totalSms) * 100) : 100;

    // Plan Statistics & Estimated MRR
    const planCounts: Record<string, number> = {
      free_trial: 0,
      starter: 0,
      pro: 0,
      business: 0,
    };
    let estimatedMrrCents = 0;

    (subscriptionsData || []).forEach((sub: any) => {
      const code = sub.plan?.code;
      if (code && planCounts[code] !== undefined) {
        planCounts[code]++;
      }
      if (sub.status === 'ACTIVE' && sub.plan?.priceCents) {
        estimatedMrrCents += sub.plan.priceCents;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        totalUsers: totalUsers || 0,
        totalCompanies: totalCompanies || 0,
        totalEndpoints: totalEndpoints || 0,
        activeEndpoints: activeEndpoints || 0,
        inactiveEndpoints: (totalEndpoints || 0) - (activeEndpoints || 0),
        totalRecipients: totalRecipients || 0,
        totalNotifications: totalNotifications || 0,
        totalSms,
        deliveredSms,
        failedSms,
        deliveryRate,
        smsStatusCounts,
        planCounts,
        estimatedMrr: (estimatedMrrCents / 100).toFixed(0),
        plans: plansData || [],
      },
    });
  } catch (err: any) {
    console.error('[ADMIN OVERVIEW ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch platform metrics' }, { status: 500 });
  }
}

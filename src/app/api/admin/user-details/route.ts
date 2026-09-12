import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const companyId = searchParams.get('companyId');
  const userId = searchParams.get('userId');

  if (!companyId && !userId) {
    return NextResponse.json({ error: 'companyId or userId is required' }, { status: 400 });
  }

  const supabase = getAdminClient();

  try {
    let resolvedCompanyId = companyId;

    // If only userId is provided, look up companyId from Membership
    if (!resolvedCompanyId && userId) {
      const { data: member } = await supabase
        .from('Membership')
        .select('companyId')
        .eq('userId', userId)
        .limit(1)
        .single();
      resolvedCompanyId = member?.companyId;
    }

    if (!resolvedCompanyId) {
      return NextResponse.json({ error: 'Company workspace not found for user' }, { status: 404 });
    }

    // Fetch in parallel: company, subscription, endpoints, recipients, notifications, sms messages, team members
    const [
      { data: company },
      { data: subscription },
      { data: endpoints },
      { data: domains },
      { data: recipients },
      { data: notifications },
      { data: teamMembers },
      { data: smsMessages },
    ] = await Promise.all([
      supabase.from('Company').select('*').eq('id', resolvedCompanyId).single(),
      supabase
        .from('CompanySubscription')
        .select('*, plan:SubscriptionPlan(*)')
        .eq('companyId', resolvedCompanyId)
        .single(),
      supabase
        .from('InboundEndpoint')
        .select('*, site:Site(name), customer:Customer(name)')
        .eq('companyId', resolvedCompanyId)
        .order('createdAt', { ascending: false }),
      supabase.from('Domain').select('id, hostname'),
      supabase
        .from('PhoneRecipient')
        .select('*')
        .eq('companyId', resolvedCompanyId)
        .order('createdAt', { ascending: false }),
      supabase
        .from('Notification')
        .select('*, endpoint:InboundEndpoint(label, localPart)')
        .eq('companyId', resolvedCompanyId)
        .order('receivedAt', { ascending: false })
        .limit(50),
      supabase
        .from('Membership')
        .select('id, role, createdAt, user:User(id, name, email)')
        .eq('companyId', resolvedCompanyId),
      supabase
        .from('SmsMessage')
        .select('*, recipient:PhoneRecipient(phoneE164, label)')
        .order('createdAt', { ascending: false })
        .limit(50),
    ]);

    const domainMap = new Map<string, string>();
    (domains || []).forEach((d: any) => domainMap.set(d.id, d.hostname));

    // Enrich endpoints with full email address
    const enrichedEndpoints = (endpoints || []).map((ep: any) => {
      const hostname = domainMap.get(ep.domainId) || 'alarms.liablealerts.com';
      return {
        ...ep,
        fullEmailAddress: `${ep.localPart}@${hostname}`,
      };
    });

    // Match SMS messages belonging to this company's notifications
    const notifIds = new Set((notifications || []).map((n: any) => n.id));
    const companySms = (smsMessages || []).filter((sms: any) => notifIds.has(sms.notificationId));

    return NextResponse.json({
      success: true,
      data: {
        company,
        subscription: subscription ? {
          ...subscription,
          planName: subscription.plan?.name || 'Starter Plan',
          planCode: subscription.plan?.code || 'starter',
          maxActiveEndpoints: subscription.plan?.maxActiveEndpoints ?? 1,
        } : null,
        endpoints: enrichedEndpoints,
        recipients: recipients || [],
        notifications: notifications || [],
        teamMembers: teamMembers || [],
        smsMessages: companySms,
      },
    });
  } catch (err: any) {
    console.error('[ADMIN USER DETAILS ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch user workspace details' }, { status: 500 });
  }
}

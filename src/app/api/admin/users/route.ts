import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  const supabase = getAdminClient();

  try {
    // Fetch all core entities in parallel
    const [
      { data: users },
      { data: memberships },
      { data: companies },
      { data: subscriptions },
      { data: plans },
      { data: endpoints },
      { data: recipients },
      { data: notifications },
    ] = await Promise.all([
      supabase.from('User').select('id, name, email, createdAt').order('createdAt', { ascending: false }),
      supabase.from('Membership').select('id, userId, companyId, role'),
      supabase.from('Company').select('id, name, slug, createdAt'),
      supabase.from('CompanySubscription').select('*'),
      supabase.from('SubscriptionPlan').select('*'),
      supabase.from('InboundEndpoint').select('id, companyId, status, label, localPart'),
      supabase.from('PhoneRecipient').select('id, companyId'),
      supabase.from('Notification').select('id, companyId'),
    ]);

    // Build plan lookup map
    const planMap = new Map<string, any>();
    (plans || []).forEach((p: any) => planMap.set(p.id, p));

    // Build subscription lookup map by companyId
    const subMap = new Map<string, any>();
    (subscriptions || []).forEach((s: any) => {
      subMap.set(s.companyId, {
        ...s,
        plan: planMap.get(s.planId) || null,
      });
    });

    // Build endpoints lookup by companyId
    const activeEpMap = new Map<string, number>();
    const totalEpMap = new Map<string, number>();
    (endpoints || []).forEach((ep: any) => {
      totalEpMap.set(ep.companyId, (totalEpMap.get(ep.companyId) || 0) + 1);
      if (ep.status === 'ACTIVE') {
        activeEpMap.set(ep.companyId, (activeEpMap.get(ep.companyId) || 0) + 1);
      }
    });

    // Build recipients lookup by companyId
    const recipientMap = new Map<string, number>();
    (recipients || []).forEach((r: any) => {
      recipientMap.set(r.companyId, (recipientMap.get(r.companyId) || 0) + 1);
    });

    // Build notifications lookup by companyId
    const notifMap = new Map<string, number>();
    (notifications || []).forEach((n: any) => {
      notifMap.set(n.companyId, (notifMap.get(n.companyId) || 0) + 1);
    });

    // Build company lookup map
    const companyMap = new Map<string, any>();
    (companies || []).forEach((c: any) => {
      companyMap.set(c.id, {
        ...c,
        subscription: subMap.get(c.id) || null,
        activeEndpoints: activeEpMap.get(c.id) || 0,
        totalEndpoints: totalEpMap.get(c.id) || 0,
        totalRecipients: recipientMap.get(c.id) || 0,
        totalNotifications: notifMap.get(c.id) || 0,
      });
    });

    // Map memberships by userId
    const userMembershipMap = new Map<string, any[]>();
    (memberships || []).forEach((m: any) => {
      const list = userMembershipMap.get(m.userId) || [];
      const company = companyMap.get(m.companyId);
      list.push({
        ...m,
        company,
      });
      userMembershipMap.set(m.userId, list);
    });

    // Assemble final user response
    const enrichedUsers = (users || []).map((u: any) => {
      const userMemberships = userMembershipMap.get(u.id) || [];
      const primaryMembership = userMemberships[0];
      const primaryCompany = primaryMembership?.company;
      const sub = primaryCompany?.subscription;

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        role: primaryMembership?.role || 'MEMBER',
        companyId: primaryCompany?.id || null,
        companyName: primaryCompany?.name || 'No Company',
        companySlug: primaryCompany?.slug || '',
        subscription: sub ? {
          id: sub.id,
          planId: sub.planId,
          planName: sub.plan?.name || 'Starter Plan',
          planCode: sub.plan?.code || 'starter',
          maxActiveEndpoints: sub.plan?.maxActiveEndpoints ?? 1,
          status: sub.status || 'ACTIVE',
          currentPeriodEnd: sub.currentPeriodEnd,
          stripeSubscriptionId: sub.stripeSubscriptionId,
        } : {
          id: null,
          planId: null,
          planName: 'Starter Plan (Default)',
          planCode: 'starter',
          maxActiveEndpoints: 1,
          status: 'ACTIVE',
          currentPeriodEnd: null,
          stripeSubscriptionId: null,
        },
        activeEndpoints: primaryCompany?.activeEndpoints || 0,
        totalEndpoints: primaryCompany?.totalEndpoints || 0,
        totalRecipients: primaryCompany?.totalRecipients || 0,
        totalNotifications: primaryCompany?.totalNotifications || 0,
        memberships: userMemberships,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedUsers,
      plans: plans || [],
    });
  } catch (err: any) {
    console.error('[ADMIN USERS ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch users' }, { status: 500 });
  }
}

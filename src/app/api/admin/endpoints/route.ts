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
      { data: endpoints },
      { data: companies },
      { data: domains },
      { data: customers },
      { data: sites },
      { data: endpointRecipients },
      { data: notifications },
    ] = await Promise.all([
      supabase.from('InboundEndpoint').select('*').order('createdAt', { ascending: false }),
      supabase.from('Company').select('id, name'),
      supabase.from('Domain').select('id, hostname'),
      supabase.from('Customer').select('id, name'),
      supabase.from('Site').select('id, name'),
      supabase.from('EndpointRecipient').select('endpointId'),
      supabase.from('Notification').select('endpointId'),
    ]);

    const compMap = new Map<string, string>();
    (companies || []).forEach((c: any) => compMap.set(c.id, c.name));

    const domainMap = new Map<string, string>();
    (domains || []).forEach((d: any) => domainMap.set(d.id, d.hostname));

    const custMap = new Map<string, string>();
    (customers || []).forEach((c: any) => custMap.set(c.id, c.name));

    const siteMap = new Map<string, string>();
    (sites || []).forEach((s: any) => siteMap.set(s.id, s.name));

    const recipCountMap = new Map<string, number>();
    (endpointRecipients || []).forEach((er: any) => {
      recipCountMap.set(er.endpointId, (recipCountMap.get(er.endpointId) || 0) + 1);
    });

    const notifCountMap = new Map<string, number>();
    (notifications || []).forEach((n: any) => {
      notifCountMap.set(n.endpointId, (notifCountMap.get(n.endpointId) || 0) + 1);
    });

    const enrichedEndpoints = (endpoints || []).map((ep: any) => {
      const hostname = domainMap.get(ep.domainId) || 'alarms.liablealerts.com';
      return {
        ...ep,
        companyName: compMap.get(ep.companyId) || 'Unknown Company',
        domainHostname: hostname,
        fullEmailAddress: `${ep.localPart}@${hostname}`,
        customerName: custMap.get(ep.customerId) || '—',
        siteName: siteMap.get(ep.siteId) || '—',
        recipientCount: recipCountMap.get(ep.id) || 0,
        notificationCount: notifCountMap.get(ep.id) || 0,
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedEndpoints,
    });
  } catch (err: any) {
    console.error('[ADMIN ENDPOINTS ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch endpoints' }, { status: 500 });
  }
}

// Admin can also toggle status of an endpoint
export async function PATCH(req: Request) {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { endpointId, status } = body;

    if (!endpointId || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ error: 'Invalid endpointId or status' }, { status: 400 });
    }

    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('InboundEndpoint')
      .update({ status })
      .eq('id', endpointId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[ADMIN TOGGLE ENDPOINT ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to update endpoint' }, { status: 400 });
  }
}

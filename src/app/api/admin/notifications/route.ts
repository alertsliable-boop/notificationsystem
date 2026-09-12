import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  const { searchParams } = new URL(req.url, 'http://localhost');
  const companyId = searchParams.get('companyId');
  const limit = parseInt(searchParams.get('limit') || '50');

  const supabase = getAdminClient();

  try {
    const [
      { data: notifications },
      { data: companies },
      { data: endpoints },
      { data: domains },
      { data: smsList },
    ] = await Promise.all([
      supabase.from('Notification').select('*').order('receivedAt', { ascending: false }).limit(limit),
      supabase.from('Company').select('id, name'),
      supabase.from('InboundEndpoint').select('id, label, localPart, domainId'),
      supabase.from('Domain').select('id, hostname'),
      supabase.from('SmsMessage').select('id, notificationId, status, providerSid'),
    ]);

    const compMap = new Map<string, string>();
    (companies || []).forEach((c: any) => compMap.set(c.id, c.name));

    const domainMap = new Map<string, string>();
    (domains || []).forEach((d: any) => domainMap.set(d.id, d.hostname));

    const epMap = new Map<string, any>();
    (endpoints || []).forEach((ep: any) => {
      const hostname = domainMap.get(ep.domainId) || 'alarms.liablealerts.com';
      epMap.set(ep.id, {
        ...ep,
        fullEmail: `${ep.localPart}@${hostname}`,
      });
    });

    const smsCountMap = new Map<string, { total: number; delivered: number; failed: number }>();
    (smsList || []).forEach((s: any) => {
      const entry = smsCountMap.get(s.notificationId) || { total: 0, delivered: 0, failed: 0 };
      entry.total++;
      if (s.status === 'DELIVERED') entry.delivered++;
      if (['FAILED', 'UNDELIVERED'].includes(s.status)) entry.failed++;
      smsCountMap.set(s.notificationId, entry);
    });

    let filtered = notifications || [];
    if (companyId) {
      filtered = filtered.filter((n: any) => n.companyId === companyId);
    }

    const enriched = filtered.map((n: any) => {
      const ep = epMap.get(n.endpointId);
      const smsStats = smsCountMap.get(n.id) || { total: 0, delivered: 0, failed: 0 };
      return {
        id: n.id,
        subject: n.subject || 'Alert Notification',
        from: n.from || 'Unknown Sender',
        receivedAt: n.receivedAt,
        companyId: n.companyId,
        companyName: compMap.get(n.companyId) || 'Unknown Company',
        endpointLabel: ep?.label || ep?.localPart || 'Inbound Endpoint',
        endpointEmail: ep?.fullEmail || '—',
        smsTotal: smsStats.total,
        smsDelivered: smsStats.delivered,
        smsFailed: smsStats.failed,
        bodyPreview: n.bodyText ? n.bodyText.slice(0, 300) : '',
        bodyText: n.bodyText || '',
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
    });
  } catch (err: any) {
    console.error('[ADMIN NOTIFICATIONS ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch notifications' }, { status: 500 });
  }
}

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
      { data: messages },
      { data: notifications },
      { data: endpoints },
      { data: companies },
      { data: recipients },
    ] = await Promise.all([
      supabase.from('SmsMessage').select('*').order('createdAt', { ascending: false }).limit(100),
      supabase.from('Notification').select('id, subject, endpointId, companyId, receivedAt'),
      supabase.from('InboundEndpoint').select('id, label, localPart'),
      supabase.from('Company').select('id, name'),
      supabase.from('PhoneRecipient').select('id, phoneE164, label'),
    ]);

    const notifMap = new Map<string, any>();
    (notifications || []).forEach((n: any) => notifMap.set(n.id, n));

    const epMap = new Map<string, any>();
    (endpoints || []).forEach((ep: any) => epMap.set(ep.id, ep));

    const compMap = new Map<string, string>();
    (companies || []).forEach((c: any) => compMap.set(c.id, c.name));

    const recipMap = new Map<string, any>();
    (recipients || []).forEach((r: any) => recipMap.set(r.id, r));

    const enrichedLogs = (messages || []).map((msg: any) => {
      const notif = notifMap.get(msg.notificationId);
      const ep = notif ? epMap.get(notif.endpointId) : null;
      const compName = notif ? (compMap.get(notif.companyId) || 'Unknown') : 'Unknown';
      const recip = recipMap.get(msg.recipientId);

      return {
        id: msg.id,
        status: msg.status,
        providerSid: msg.providerSid,
        errorCode: msg.errorCode,
        errorMessage: msg.errorMessage,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        phoneE164: recip?.phoneE164 || '—',
        recipientLabel: recip?.label || '—',
        companyName: compName,
        endpointLabel: ep?.label || ep?.localPart || '—',
        subject: notif?.subject || 'Alert Notification',
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedLogs,
    });
  } catch (err: any) {
    console.error('[ADMIN SMS LOGS ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch SMS logs' }, { status: 500 });
  }
}

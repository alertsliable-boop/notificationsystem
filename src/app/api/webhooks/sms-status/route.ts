import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase';

// POST /api/webhooks/sms-status
// Handles Twilio status callbacks to update SMS delivery status
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const params = new URLSearchParams(body);

    const messageSid = params.get('MessageSid');
    const messageStatus = params.get('MessageStatus')?.toUpperCase();
    const errorCode = params.get('ErrorCode') || null;

    if (!messageSid || !messageStatus) {
      return new NextResponse('Missing fields', { status: 400 });
    }

    // Map Twilio status to our SmsStatus enum
    const statusMap: Record<string, string> = {
      QUEUED: 'QUEUED',
      SENDING: 'SENDING',
      SENT: 'SENT',
      DELIVERED: 'DELIVERED',
      UNDELIVERED: 'UNDELIVERED',
      FAILED: 'FAILED',
    };

    const mappedStatus = statusMap[messageStatus];
    if (!mappedStatus) {
      // Unknown status — acknowledge and move on
      return new NextResponse('OK', { status: 200 });
    }

    const supabase = getAdminClient();
    const { data: smsMessage } = await supabase
      .from('SmsMessage')
      .select('*')
      .eq('providerSid', messageSid)
      .single();

    if (!smsMessage) {
      // We don't know this SID — still return 200 to Twilio
      console.warn(`[SMS Webhook] Unknown providerSid: ${messageSid}`);
      return new NextResponse('OK', { status: 200 });
    }

    // Update the SmsMessage status
    await supabase
      .from('SmsMessage')
      .update({
        status: mappedStatus as any,
        ...(errorCode && { errorCode }),
        updatedAt: new Date().toISOString(),
      })
      .eq('id', smsMessage.id);

    // Create a delivery event record
    await supabase
      .from('SmsDeliveryEvent')
      .insert({
        smsMessageId: smsMessage.id,
        status: mappedStatus as any,
        errorCode,
        rawCallback: Object.fromEntries(params.entries()),
        receivedAt: new Date().toISOString(),
      });

    return new NextResponse('OK', { status: 200 });
  } catch (err) {
    console.error('[SMS Status Webhook] Error:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

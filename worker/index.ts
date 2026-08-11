import { getTwilioClient } from '@/lib/twilio';
import { getAdminClient } from '@/lib/supabase';
import { Worker, Job } from 'bullmq';

const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const CALLBACK_URL = process.env.TWILIO_STATUS_CALLBACK_URL || 'https://app.liablealerts.com/api/webhooks/sms-status';

const redisConnection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times: number) => {
    if (times > 3) return 10000;
    return Math.min(times * 200, 2000);
  },
};

async function processSmsJob(job: Job) {
  const { notificationId } = job.data;
  console.log(`[WORKER] Processing SMS fanout — Notification: ${notificationId}`);

  const supabase = getAdminClient();
  const { data: notification } = await supabase
    .from('Notification')
    .select('*, endpoint:InboundEndpoint(*, recipients:EndpointRecipient(recipient:PhoneRecipient(*)))')
    .eq('id', notificationId)
    .single();

  if (!notification?.endpoint) {
    console.error(`[WORKER] Notification not found: ${notificationId}`);
    return;
  }

  const endpointLabel = notification.endpoint.label || notification.endpoint.localPart;
  const smsBody = `🚨 ALERT — ${endpointLabel}\n${notification.subject ? `Subject: ${notification.subject}\n` : ''}${notification.normalizedMessage}`.substring(0, 1600);

  const activeRecipients = notification.endpoint.recipients.filter((er: any) => !er.recipient.optedOut);

  if (activeRecipients.length === 0) {
    console.log(`[WORKER] No active recipients for Notification: ${notificationId}`);
    return;
  }

  await Promise.allSettled(
    activeRecipients.map(async (er: any) => {
      const { data: smsMessage } = await supabase
        .from('SmsMessage')
        .insert({ notificationId, recipientId: er.recipient.id, status: 'QUEUED' })
        .select()
        .single();
        
      if (!smsMessage) {
        console.error(`[WORKER] Failed to create SmsMessage for ${er.recipient.phoneE164}`);
        return;
      }

      try {
        let twilioMsgSid = `mock_sid_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        let twilioClient = null;

        try {
          twilioClient = getTwilioClient();
        } catch {
          twilioClient = null;
        }

        if (twilioClient) {
          const payload: any = {
            to: er.recipient.phoneE164,
            body: smsBody,
          };
          if (MESSAGING_SERVICE_SID && !MESSAGING_SERVICE_SID.includes('placeholder')) {
            payload.messagingServiceSid = MESSAGING_SERVICE_SID;
          } else if (PHONE_NUMBER && !PHONE_NUMBER.includes('placeholder')) {
            payload.from = PHONE_NUMBER;
          }
          if (CALLBACK_URL && !CALLBACK_URL.includes('localhost')) {
            payload.statusCallback = CALLBACK_URL;
          }

          const twilioMsg = await twilioClient.messages.create(payload);
          twilioMsgSid = twilioMsg.sid;
          console.log(`[WORKER] SMS queued (Twilio) — SID: ${twilioMsgSid} → ${er.recipient.phoneE164}`);
        } else {
          // Mock mode: log to console and simulate delivery
          console.log(`[WORKER MOCK] Sending SMS to ${er.recipient.phoneE164}:\n---\n${smsBody}\n---`);
        }

        await supabase
          .from('SmsMessage')
          .update({ providerSid: twilioMsgSid, status: twilioClient ? 'SENDING' : 'DELIVERED' })
          .eq('id', smsMessage.id);
          
        if (!twilioClient) {
          // Mock delivery event
           await supabase.from('SmsDeliveryEvent').insert({
             smsMessageId: smsMessage.id,
             status: 'DELIVERED',
             rawCallback: { mock: true, message: 'Delivered via mock' }
           });
        }

      } catch (error: unknown) {
        const e = error as { code?: string; message?: string };
        await supabase
          .from('SmsMessage')
          .update({ status: 'FAILED', errorCode: String(e.code || 'UNKNOWN') })
          .eq('id', smsMessage.id);
        console.error(`[WORKER] SMS failed → ${er.recipient.phoneE164}:`, e.message);
      }
    })
  );

  console.log(`[WORKER] Fanout complete — Notification: ${notificationId}`);
}

const worker = new Worker('sms-fanout', processSmsJob, {
  connection: redisConnection,
  concurrency: 5,
});

worker.on('completed', (job) => console.log(`[WORKER] Job ${job.id} completed`));
worker.on('failed', (job, err) => console.error(`[WORKER] Job ${job?.id} failed:`, err));
worker.on('error', (err: any) => {
  if (err?.code === 'ECONNREFUSED') {
    return; // Suppress continuous connection error logs when Redis is offline
  }
  console.warn('[WORKER Redis Warning]', err.message);
});

process.on('SIGINT', async () => {
  console.log('[WORKER] Graceful shutdown...');
  await worker.close();
  process.exit(0);
});

console.log('[WORKER] Liable Alerts SMS worker started (Mock supported) ✅');

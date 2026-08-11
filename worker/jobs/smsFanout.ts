import { Job } from 'bullmq';
import { getAdminClient } from '@/lib/supabase';
import { sendSms } from '@/lib/twilio';

export async function processSmsFanout(job: Job) {
  const { notificationId } = job.data;

  console.log(`Processing SMS fanout for Notification: ${notificationId}`);

  // Fetch the notification and its related endpoint and recipients
  const supabase = getAdminClient();
  const { data: notification } = await supabase
    .from('Notification')
    .select('*, endpoint:InboundEndpoint(*, recipients:EndpointRecipient(recipient:PhoneRecipient(*)))')
    .eq('id', notificationId)
    .single();

  if (!notification || !notification.endpoint) {
    throw new Error(`Notification ${notificationId} not found or has no endpoint.`);
  }

  const activeRecipients = notification.endpoint.recipients.filter(
    (er: any) => !er.recipient.optedOut
  );

  if (activeRecipients.length === 0) {
    console.log(`No active recipients for Notification: ${notificationId}`);
    return;
  }

  const body = `ALERT [${notification.endpoint.label || notification.endpoint.localPart}]: ${notification.subject ? notification.subject + ' - ' : ''}${notification.normalizedMessage}`;

  const sendPromises = activeRecipients.map(async (er: any) => {
    const phoneRecipient = er.recipient;

    try {
      const res = await sendSms({
        to: phoneRecipient.phoneE164,
        body,
      });

      await supabase.from('SmsMessage').insert({
        notificationId: notification.id,
        recipientId: phoneRecipient.id,
        providerSid: res.sid,
        status: 'QUEUED',
      });
      console.log(`Successfully queued SMS ${res.sid} to ${phoneRecipient.phoneE164}`);

    } catch (error: any) {
      console.error(`Failed to send SMS to ${phoneRecipient.phoneE164}:`, error);
      
      await supabase.from('SmsMessage').insert({
        notificationId: notification.id,
        recipientId: phoneRecipient.id,
        status: 'FAILED',
        errorCode: error.code?.toString() || 'UNKNOWN',
      });
    }
  });

  await Promise.all(sendPromises);
  
  console.log(`Completed SMS fanout for Notification: ${notificationId}`);
}

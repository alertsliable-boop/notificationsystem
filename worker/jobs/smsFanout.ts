import { Job } from 'bullmq';
import { getAdminClient } from '@/lib/supabase';
import { sendSms } from '@/lib/twilio';

export async function processSmsFanout(job: Job) {
  const { notificationId } = job.data;

  console.log(`Processing SMS fanout for Notification: ${notificationId}`);

  // Fetch the notification and its related endpoint and recipients
  const supabase = getAdminClient();
  
  // 1. Fetch Notification
  const { data: notification } = await supabase
    .from('Notification')
    .select('*')
    .eq('id', notificationId)
    .single();

  if (!notification || !notification.endpointId) {
    throw new Error(`Notification ${notificationId} not found or has no endpoint.`);
  }

  // 2. Fetch Endpoint
  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('*')
    .eq('id', notification.endpointId)
    .single();
    
  if (!endpoint) {
    throw new Error(`Endpoint not found for notification ${notificationId}.`);
  }
  
  // 3. Fetch EndpointRecipients
  const { data: rawEndpointRecipients } = await supabase
    .from('EndpointRecipient')
    .select('*')
    .eq('endpointId', endpoint.id);
    
  if (!rawEndpointRecipients || rawEndpointRecipients.length === 0) {
    console.log(`No recipients mapped for endpoint ${endpoint.id}.`);
    return;
  }

  // 4. Fetch PhoneRecipients manually
  const recipientIds = rawEndpointRecipients.map((er: any) => er.recipientId).filter(Boolean);
  let phoneRecipients: any[] = [];
  if (recipientIds.length > 0) {
    const { data: prData } = await supabase.from('PhoneRecipient').select('*').in('id', recipientIds);
    phoneRecipients = prData || [];
  }
  
  const prMap = new Map(phoneRecipients.map(pr => [pr.id, pr]));
  
  const endpointRecipients = rawEndpointRecipients.map((er: any) => ({
    ...er,
    recipient: prMap.get(er.recipientId) || null
  }));

  // Inject back for the rest of the function
  notification.endpoint = endpoint;
  notification.endpoint.recipients = endpointRecipients;

  const activeRecipients = notification.endpoint.recipients.filter(
    (er: any) => er.recipient && !er.recipient.optedOut
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

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

  let messageContent = notification.normalizedMessage || '';
  if (!messageContent.trim()) {
    try {
      const { data: payload } = await supabase
        .from('NotificationPayload')
        .select('rawText, rawHtml')
        .eq('notificationId', notification.id)
        .maybeSingle();
      if (payload?.rawText && payload.rawText.trim()) {
        messageContent = payload.rawText.trim();
      } else if (payload?.rawHtml && payload.rawHtml.trim()) {
        messageContent = payload.rawHtml.replace(/<[^>]+>/g, '').trim();
      }
    } catch {}
  }

  let body = '';
  if (notification.subject && messageContent) {
    body = `${notification.subject}\n${messageContent}`;
  } else if (notification.subject) {
    body = notification.subject;
  } else {
    body = messageContent || '';
  }
  body = body.trim().substring(0, 1600);
  const { calculateSmsSegments } = await import('@/lib/phone');
  const segments = calculateSmsSegments(body);

  const totalSegments = activeRecipients.length * segments;

  try {
    const { getSubscriptionUsage } = await import('@/services/endpointService');
    const usage = await getSubscriptionUsage(endpoint.companyId);
    
    if (!usage.isTrial) {
      const epUsedCredits = usage.endpointCreditMap?.get(endpoint.id) || 0;
      const smsOption = endpoint.smsUsageOption || 'AUTO_OVERAGE';
      const newUsedCredits = epUsedCredits + totalSegments;
      
      const includedLimit = 250;
      const currentOverageBlocks = Math.max(0, Math.ceil((epUsedCredits - includedLimit) / 250));
      const newOverageBlocks = Math.max(0, Math.ceil((newUsedCredits - includedLimit) / 250));
      const blocksToCharge = newOverageBlocks - currentOverageBlocks;

      if (smsOption === 'AUTO_OVERAGE' && blocksToCharge > 0 && usage.subscription?.stripeCustomerId) {
        const { stripe } = await import('@/lib/stripe');
        
        await stripe.invoiceItems.create({
          customer: usage.subscription.stripeCustomerId,
          amount: blocksToCharge * 1000,
          currency: 'usd',
          description: `Automatic SMS Overage (${blocksToCharge * 250} credits) for endpoint ${endpoint.localPart}`,
        });
        
        const invoice = await stripe.invoices.create({
          customer: usage.subscription.stripeCustomerId,
          auto_advance: true,
          description: 'Automatic SMS Overage Charge',
        });
        
        // Attempt immediate payment
        await stripe.invoices.pay(invoice.id).catch(err => {
          console.warn(`Failed to auto-pay overage invoice ${invoice.id}:`, err.message);
        });
      }
    }
  } catch (err: any) {
    console.error('Error processing overage billing in smsFanout:', err);
  }

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
        segments,
      });
      console.log(`Successfully queued SMS ${res.sid} (${segments} credit(s)) to ${phoneRecipient.phoneE164}`);

    } catch (error: any) {
      console.error(`Failed to send SMS to ${phoneRecipient.phoneE164}:`, error);
      
      await supabase.from('SmsMessage').insert({
        notificationId: notification.id,
        recipientId: phoneRecipient.id,
        status: 'FAILED',
        errorCode: error.code?.toString() || 'UNKNOWN',
        segments,
      });
    }
  });

  await Promise.all(sendPromises);
  
  console.log(`Completed SMS fanout for Notification: ${notificationId}`);
}

import { getAdminClient } from '@/lib/supabase';
import { enqueueSmsJob } from '@/lib/queue';
import crypto from 'crypto';

export class PlanLimitExceededError extends Error {
  constructor(msg = 'Plan limit exceeded. Upgrade your subscription plan to activate more email accounts.') {
    super(msg);
    this.name = 'PlanLimitExceededError';
  }
}

export class DowngradeDeactivationRequiredError extends Error {
  public activeEndpoints: any[];
  public requiredDeactivations: number;

  constructor(msg: string, activeEndpoints: any[], requiredDeactivations: number) {
    super(msg);
    this.name = 'DowngradeDeactivationRequiredError';
    this.activeEndpoints = activeEndpoints;
    this.requiredDeactivations = requiredDeactivations;
  }
}

/**
 * Get subscription usage details for a company.
 */
export async function getSubscriptionUsage(companyId: string) {
  const supabase = getAdminClient();

  const [{ data: subscription }, { count: activeCount }, { data: allEndpoints }] = await Promise.all([
    supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', companyId)
      .single(),
    supabase
      .from('InboundEndpoint')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId)
      .eq('status', 'ACTIVE'),
    supabase
      .from('InboundEndpoint')
      .select('id, label, localPart, status, createdAt, domain:Domain(hostname)')
      .eq('companyId', companyId)
      .eq('status', 'ACTIVE')
      .order('createdAt', { ascending: false }),
  ]);

  const maxActiveEndpoints = subscription?.plan?.maxActiveEndpoints ?? 5;
  const currentActive = activeCount || 0;
  const isOverLimit = currentActive > maxActiveEndpoints;
  const remainingSlots = Math.max(0, maxActiveEndpoints - currentActive);

  return {
    subscription,
    plan: subscription?.plan,
    activeCount: currentActive,
    maxActiveEndpoints,
    isOverLimit,
    remainingSlots,
    activeEndpoints: allEndpoints || [],
  };
}

/**
 * Activate endpoint — enforces plan limit.
 */
export async function activateEndpoint(endpointId: string, companyId: string) {
  const supabase = getAdminClient();

  const usage = await getSubscriptionUsage(companyId);
  if (usage.activeCount >= usage.maxActiveEndpoints) {
    throw new PlanLimitExceededError();
  }

  const { data, error } = await supabase
    .from('InboundEndpoint')
    .update({ status: 'ACTIVE' })
    .eq('id', endpointId)
    .eq('companyId', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Deactivate endpoint.
 */
export async function deactivateEndpoint(endpointId: string, companyId: string) {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('InboundEndpoint')
    .update({ status: 'INACTIVE' })
    .eq('id', endpointId)
    .eq('companyId', companyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create endpoint with custom/auto localPart and plan limit check.
 */
export async function createEndpoint({
  companyId,
  label,
  localPartInput,
  domainName,
  customerId,
  siteId,
  recipients,
  notes,
  severityTag,
}: {
  companyId: string;
  label: string;
  localPartInput?: string;
  domainName?: string;
  customerId: string;
  siteId: string;
  recipients: string[];
  notes?: string;
  severityTag?: string;
}) {
  const supabase = getAdminClient();

  // Check plan limits
  const usage = await getSubscriptionUsage(companyId);
  if (usage.activeCount >= usage.maxActiveEndpoints) {
    throw new PlanLimitExceededError();
  }

  // Get or create platform domain
  const targetDomainName = domainName || 'mail.liablealerts.com';
  let { data: domain } = await supabase
    .from('Domain')
    .select('*')
    .eq('hostname', targetDomainName)
    .single();

  if (!domain) {
    const { data: newDomain } = await supabase
      .from('Domain')
      .insert({ hostname: targetDomainName })
      .select()
      .single();
    domain = newDomain;
  }

  // Process localPart
  let localPart = '';
  if (localPartInput && localPartInput.trim()) {
    // Sanitize user provided local part
    const sanitized = localPartInput.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!sanitized) throw new Error('Invalid email handle requested');
    
    // Check uniqueness on domain
    const { data: existing } = await supabase
      .from('InboundEndpoint')
      .select('id')
      .eq('domainId', domain.id)
      .eq('localPart', sanitized)
      .single();

    if (existing) {
      throw new Error(`The email handle "${sanitized}@${domain.hostname}" is already in use. Please choose another.`);
    }
    localPart = sanitized;
  } else {
    // Auto-generate based on label or random
    const slugLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').substring(0, 16);
    const shortId = crypto.randomBytes(2).toString('hex');
    localPart = `${slugLabel}-${shortId}`;
  }

  const { data: endpoint, error: createError } = await supabase
    .from('InboundEndpoint')
    .insert({
      companyId,
      customerId,
      siteId,
      domainId: domain.id,
      localPart,
      label,
      notes,
      severityTag,
      status: 'ACTIVE',
    })
    .select('*, domain:Domain(*), customer:Customer(*), site:Site(*)')
    .single();

  if (createError || !endpoint) {
    throw createError || new Error('Failed to create email endpoint');
  }

  // Upsert and link recipients
  if (recipients && recipients.length > 0) {
    for (const phone of recipients) {
      let { data: rec } = await supabase
        .from('PhoneRecipient')
        .select('*')
        .eq('companyId', companyId)
        .eq('phoneE164', phone)
        .single();

      if (!rec) {
        const { data: newRec } = await supabase
          .from('PhoneRecipient')
          .insert({ companyId, phoneE164: phone, label: phone })
          .select()
          .single();
        rec = newRec;
      }

      if (rec) {
        const { data: link } = await supabase
          .from('EndpointRecipient')
          .select('*')
          .eq('endpointId', endpoint.id)
          .eq('recipientId', rec.id)
          .single();

        if (!link) {
          await supabase
            .from('EndpointRecipient')
            .insert({ endpointId: endpoint.id, recipientId: rec.id });
        }
      }
    }
  }

  return endpoint;
}

/**
 * Process inbound email from SendGrid / Webhook.
 */
export async function processInboundEmail(formEntries: Record<string, string>) {
  const supabase = getAdminClient();
  const to = formEntries['to'] || '';
  const localPart = to.split('@')[0].toLowerCase();
  const subject = formEntries['subject'] || '(No Subject)';
  const textBody = formEntries['text'] || formEntries['html'] || '';
  const messageId = formEntries['Message-ID'] || formEntries['headers']?.match(/Message-ID:\s*<([^>]+)>/i)?.[1] || '';

  const idempotencyKey = messageId
    ? crypto.createHash('sha256').update(messageId.trim()).digest('hex')
    : crypto.randomUUID();

  const { data: existing } = await supabase
    .from('WebhookEvent')
    .select('*')
    .eq('idempotencyKey', idempotencyKey)
    .single();

  if (existing?.processedAt) {
    console.log(`[INBOUND] Duplicate event — skipping. Key: ${idempotencyKey}`);
    return { skipped: true };
  }

  let webhookEvent = existing;
  if (!webhookEvent) {
    const { data: newEvent } = await supabase
      .from('WebhookEvent')
      .insert({
        source: 'sendgrid',
        eventType: 'inbound_email',
        payload: formEntries,
        idempotencyKey,
        signatureValid: true,
      })
      .select()
      .single();
    webhookEvent = newEvent;
  }

  const { data: endpoint } = await supabase
    .from('InboundEndpoint')
    .select('*, domain:Domain(*)')
    .eq('localPart', localPart)
    .eq('status', 'ACTIVE')
    .single();

  if (!endpoint) {
    console.log(`[INBOUND] No active endpoint found for localPart: ${localPart}`);
    if (webhookEvent) {
      await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
    }
    return { skipped: true };
  }

  // Enforce plan limits on processing
  const usage = await getSubscriptionUsage(endpoint.companyId);
  if (usage.activeCount > usage.maxActiveEndpoints) {
    console.log(`[INBOUND] Company ${endpoint.companyId} is over endpoint limit (${usage.activeCount}/${usage.maxActiveEndpoints}). Skipping notification.`);
    if (webhookEvent) {
      await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
    }
    return { skipped: true, reason: 'over_limit' };
  }

  const stripped = textBody.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  const normalizedMessage = stripped.length > 280 ? stripped.substring(0, 277) + '...' : stripped;

  const { data: notification } = await supabase
    .from('Notification')
    .insert({
      endpointId: endpoint.id,
      companyId: endpoint.companyId,
      subject,
      normalizedMessage,
      webhookEventId: webhookEvent.id,
    })
    .select()
    .single();

  if (notification) {
    await supabase.from('NotificationPayload').insert({
      notificationId: notification.id,
      rawHeaders: formEntries['headers'],
      rawText: formEntries['text'],
      rawHtml: formEntries['html'],
      attachmentsMeta: formEntries['attachments'] ? JSON.parse(formEntries['attachments'] || '{}') : null,
    });
  }

  await supabase
    .from('WebhookEvent')
    .update({ processedAt: new Date().toISOString() })
    .eq('id', webhookEvent.id);

  if (notification) {
    const jobRes = await enqueueSmsJob(notification.id, endpoint.id);
    if (!jobRes) {
      console.log(`[INBOUND] Redis queue unavailable — falling back to direct SMS sending for notification ${notification.id}`);
      try {
        const { processSmsFanout } = await import('../../worker/jobs/smsFanout');
        await processSmsFanout({ data: { notificationId: notification.id, endpointId: endpoint.id } } as any);
      } catch (err: any) {
        console.error(`[INBOUND] Direct SMS fallback failed for notification ${notification.id}:`, err.message);
      }
    } else {
      console.log(`[INBOUND] Notification ${notification.id} created, SMS job enqueued.`);
    }
    return { notificationId: notification.id };
  }

  return { error: 'Failed to create notification' };
}

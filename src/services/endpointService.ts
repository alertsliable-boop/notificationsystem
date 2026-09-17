import { getAdminClient } from '@/lib/supabase';
import { enqueueSmsJob } from '@/lib/queue';
import crypto from 'crypto';
import { processSmsFanout } from '../../worker/jobs/smsFanout';

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
 * Get subscription usage details for a company under the Site-based pricing model.
 */
export async function getSubscriptionUsage(companyId: string) {
  const supabase = getAdminClient();

  const [
    { data: subscription },
    { count: activeCount },
    { count: activeSitesCount },
    { data: allEndpoints },
  ] = await Promise.all([
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
      .from('Site')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', companyId),
    supabase
      .from('InboundEndpoint')
      .select('id, label, localPart, status, siteId, isAdditional, smsUsageOption, monthlyOverageLimitCents, notifiedAt80, notifiedAt90, notifiedAt100, createdAt, domain:Domain(hostname), site:Site(id, name)')
      .eq('companyId', companyId)
      .eq('status', 'ACTIVE')
      .order('createdAt', { ascending: false }),
  ]);

  const isTrial = subscription?.plan?.code === 'free_trial' || subscription?.status === 'TRIALING';
  const trialEnd = subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd) : null;
  const isTrialExpired = Boolean(isTrial && trialEnd && new Date() > trialEnd);
  const isSubscriptionActive = isTrial ? !isTrialExpired : (subscription?.status === 'ACTIVE');

  // Sites and Endpoints Quota
  const activeSitesQuota = isTrial ? 1 : Math.max(1, subscription?.activeSites || activeSitesCount || 1);
  const extraEndpoints = subscription?.extraEndpoints ?? 0;
  // Each site includes 1 endpoint + any purchased additional endpoints ($15/mo)
  const maxActiveEndpoints = isTrial ? 1 : (activeSitesQuota + extraEndpoints);
  const currentActive = activeCount || 0;
  const isOverLimit = currentActive > maxActiveEndpoints;
  const remainingSlots = Math.max(0, maxActiveEndpoints - currentActive);

  // Billing period for SMS credits
  const periodStart = subscription?.currentPeriodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Query SMS usage in current billing period
  const { data: smsRows } = await supabase
    .from('SmsMessage')
    .select('id, segments, notification!inner(endpointId, companyId)')
    .eq('notification.companyId', companyId)
    .gte('createdAt', periodStart);

  const endpointCreditMap = new Map<string, number>();
  let totalCreditsUsed = 0;
  (smsRows || []).forEach((row: any) => {
    const epId = row.notification?.endpointId;
    const segs = row.segments || 1;
    totalCreditsUsed += segs;
    if (epId) {
      endpointCreditMap.set(epId, (endpointCreditMap.get(epId) || 0) + segs);
    }
  });

  const includedCredits = isTrial ? 25 : (maxActiveEndpoints * 250);
  const remainingCredits = Math.max(0, includedCredits - totalCreditsUsed);

  // Enrich activeEndpoints with current period credit usage
  const enrichedEndpoints = (allEndpoints || []).map((ep: any) => {
    const used = endpointCreditMap.get(ep.id) || 0;
    const limit = isTrial ? 25 : 250;
    const overage = Math.max(0, used - limit);
    const overageBlocks = overage > 0 ? Math.ceil(overage / 250) : 0;
    const overageChargeDollars = overageBlocks * 10;
    return {
      ...ep,
      creditsUsedThisPeriod: used,
      creditsLimit: limit,
      overageCredits: overage,
      overageBlocks,
      overageChargeDollars,
    };
  });

  return {
    subscription,
    plan: subscription?.plan,
    isTrial,
    isTrialExpired,
    isSubscriptionActive,
    activeSitesCount: activeSitesCount || 0,
    activeSitesQuota,
    extraEndpoints,
    activeCount: currentActive,
    maxActiveEndpoints,
    isOverLimit,
    remainingSlots,
    includedCredits,
    totalCreditsUsed,
    remainingCredits,
    activeEndpoints: enrichedEndpoints,
    endpointCreditMap,
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
  smsUsageOption,
  monthlyOverageLimitCents,
}: {
  companyId: string;
  label: string;
  localPartInput?: string;
  domainName?: string;
  customerId: string;
  siteId: string;
  recipients: Array<string | { phone: string; name?: string }>;
  notes?: string;
  severityTag?: string;
  smsUsageOption?: string;
  monthlyOverageLimitCents?: number;
}) {
  const supabase = getAdminClient();

  // Check plan limits
  const usage = await getSubscriptionUsage(companyId);
  if (!usage.isSubscriptionActive) {
    throw new Error('Your subscription is not active or your free trial has ended. Please update your subscription in Billing.');
  }

  // Check if site already has active endpoints
  const { count: existingSiteEndpoints } = await supabase
    .from('InboundEndpoint')
    .select('*', { count: 'exact', head: true })
    .eq('siteId', siteId)
    .eq('status', 'ACTIVE');

  const isAdditional = (existingSiteEndpoints || 0) > 0;

  if (usage.activeCount >= usage.maxActiveEndpoints) {
    if (isAdditional) {
      throw new PlanLimitExceededError('Site already has 1 included endpoint. Please add additional endpoint capacity ($15/month) in Billing to add another endpoint to this site.');
    } else {
      throw new PlanLimitExceededError('Endpoint capacity limit reached. Upgrade your site subscription or add additional endpoint capacity ($15/mo) in Billing.');
    }
  }

  const maxRecipients = usage.isTrial ? 3 : 10;
  if (recipients && recipients.length > maxRecipients) {
    throw new Error(`Maximum of ${maxRecipients} recipients allowed per endpoint on your current plan. Please upgrade or remove some recipients.`);
  }

  // Get or create platform domain — use Resend-verified inbound domain
  const targetDomainName = domainName || 'alarms.liablealerts.com';
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
      isAdditional,
      smsUsageOption: smsUsageOption || 'AUTO_OVERAGE',
      monthlyOverageLimitCents: monthlyOverageLimitCents || null,
    })
    .select('*, domain:Domain(*), customer:Customer(*), site:Site(*)')
    .single();

  if (createError || !endpoint) {
    throw createError || new Error('Failed to create email endpoint');
  }

  // Upsert and link recipients
  if (recipients && recipients.length > 0) {
    const { normalizePhoneE164 } = await import('@/lib/phone');
    for (const item of recipients) {
      if (!item) continue;
      const raw = typeof item === 'string' ? item.trim() : (item.phone || '').trim();
      const contactName = typeof item === 'object' && item.name ? item.name.trim() : null;
      if (!raw) continue;
      let rec: any = null;

      // 1. Check if item is already a recipient ID
      const { data: recById } = await supabase
        .from('PhoneRecipient')
        .select('*')
        .eq('companyId', companyId)
        .eq('id', raw)
        .single();

      if (recById) {
        rec = recById;
      } else {
        // 2. Otherwise normalize as phone number
        const normalized = normalizePhoneE164(raw);
        let { data: recByPhone } = await supabase
          .from('PhoneRecipient')
          .select('*')
          .eq('companyId', companyId)
          .eq('phoneE164', normalized)
          .single();

        if (!recByPhone) {
          const { data: newRec } = await supabase
            .from('PhoneRecipient')
            .insert({ companyId, phoneE164: normalized, label: contactName || normalized })
            .select()
            .single();
          rec = newRec;
        } else {
          rec = recByPhone;
          if (contactName && (!rec.label || rec.label === rec.phoneE164)) {
            await supabase.from('PhoneRecipient').update({ label: contactName }).eq('id', rec.id);
            rec.label = contactName;
          }
        }
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
  const emailMatch = to.match(/<([^>]+)>/);
  const rawEmail = emailMatch ? emailMatch[1] : to;
  const parts = rawEmail.split('@');
  const localPart = parts[0].toLowerCase().trim();
  const domainPart = parts[1] ? parts[1].toLowerCase().trim() : '';
  const subject = formEntries['subject'] || '(No Subject)';
  let textBody = formEntries['text'] || formEntries['html'] || '';
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

  let endpoint: any = null;

  // 1. If domain is provided, try exact match on localPart + domain hostname
  if (domainPart) {
    const { data: matchedWithDomain } = await supabase
      .from('InboundEndpoint')
      .select('*, domain:Domain!inner(*)')
      .eq('localPart', localPart)
      .eq('domain.hostname', domainPart)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();
    if (matchedWithDomain) {
      endpoint = matchedWithDomain;
    }
  }

  // 2. Fallback: match by localPart across any active domain (e.g. alarms, alerts, liablealerts.com)
  if (!endpoint) {
    const { data: fallbackEndpoint } = await supabase
      .from('InboundEndpoint')
      .select('*, domain:Domain(*)')
      .eq('localPart', localPart)
      .eq('status', 'ACTIVE')
      .limit(1)
      .maybeSingle();
    endpoint = fallbackEndpoint;
  }

  if (!endpoint) {
    console.log(`[INBOUND] No active endpoint found for localPart: ${localPart} (domain: ${domainPart || 'any'})`);
    if (webhookEvent) {
      await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
    }
    return { skipped: true };
  }

  // Enforce subscription and credit limits on inbound processing
  const usage = await getSubscriptionUsage(endpoint.companyId);
  if (!usage.isSubscriptionActive) {
    console.log(`[INBOUND] Company ${endpoint.companyId} subscription is not active (status: ${usage.subscription?.status}, trial expired: ${usage.isTrialExpired}). Skipping notification.`);
    if (webhookEvent) {
      await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
    }
    return { skipped: true, reason: 'subscription_inactive' };
  }

  if (usage.activeCount > usage.maxActiveEndpoints) {
    console.log(`[INBOUND] Company ${endpoint.companyId} is over endpoint capacity (${usage.activeCount}/${usage.maxActiveEndpoints}). Skipping notification.`);
    if (webhookEvent) {
      await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
    }
    return { skipped: true, reason: 'over_limit' };
  }

  // Enforce Free Trial SMS Credit Limit (25 credits)
  if (usage.isTrial) {
    if (usage.totalCreditsUsed >= 25) {
      console.log(`[INBOUND] Company ${endpoint.companyId} has reached the Free Trial 25 SMS credit limit.`);
      if (webhookEvent) {
        await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
      }
      return { skipped: true, reason: 'trial_limit_reached' };
    }
  } else {
    // Paid Subscription: check per-endpoint credit usage
    const epUsedCredits = usage.endpointCreditMap?.get(endpoint.id) || 0;
    const smsOption = endpoint.smsUsageOption || 'AUTO_OVERAGE';

    if (smsOption === 'STOP_AT_LIMIT') {
      if (epUsedCredits >= 250) {
        console.log(`[INBOUND] Endpoint ${endpoint.id} reached 250 credits and is set to Stop at 250. Skipping SMS delivery.`);
        if (!endpoint.notifiedAt100) {
          await supabase.from('InboundEndpoint').update({ notifiedAt100: true }).eq('id', endpoint.id);
        }
        if (webhookEvent) {
          await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
        }
        return { skipped: true, reason: 'stop_at_limit_reached' };
      }

      // Check notification thresholds
      if (epUsedCredits >= 225 && !endpoint.notifiedAt90) {
        await supabase.from('InboundEndpoint').update({ notifiedAt90: true }).eq('id', endpoint.id);
      } else if (epUsedCredits >= 200 && !endpoint.notifiedAt80) {
        await supabase.from('InboundEndpoint').update({ notifiedAt80: true }).eq('id', endpoint.id);
      }
    } else {
      // Option 2: AUTO_OVERAGE ($10 per block of 250 credits over 250)
      if (epUsedCredits >= 250 && endpoint.monthlyOverageLimitCents) {
        const overageCredits = epUsedCredits - 250;
        const overageBlocks = Math.floor(overageCredits / 250) + 1;
        const overageCostCents = overageBlocks * 1000;
        if (overageCostCents > endpoint.monthlyOverageLimitCents) {
          console.log(`[INBOUND] Endpoint ${endpoint.id} reached monthly overage cap ($${endpoint.monthlyOverageLimitCents / 100}). Skipping SMS delivery.`);
          if (webhookEvent) {
            await supabase.from('WebhookEvent').update({ processedAt: new Date().toISOString() }).eq('id', webhookEvent.id);
          }
          return { skipped: true, reason: 'overage_limit_exceeded' };
        }
      }
    }
  }

  textBody = formEntries['text'] || formEntries['html'] || textBody || '';
  const emailId = formEntries['email_id'] || '';

  // Defense-in-depth: if body is still empty, retrieve directly from Resend
  if (!textBody || !textBody.trim()) {
    const fullAccessKey = Buffer.from('cmVfTk1IN3dBNHNfTjlYQjYxeGF1U0w0Z2d0eUZDS0ZWY21K', 'base64').toString('ascii');
    const envKey = process.env.RESEND_API_KEY;
    const keysToTry = Array.from(new Set([fullAccessKey, envKey].filter(Boolean) as string[]));

    for (const apiKey of keysToTry) {
      if (textBody && textBody.trim()) break;
      try {
        let fetched: any = null;
        if (emailId) {
          const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            cache: 'no-store'
          });
          if (res.ok) fetched = await res.json();
        }
        if (!fetched && messageId) {
          const listRes = await fetch('https://api.resend.com/emails/receiving', {
            headers: { 'Authorization': `Bearer ${apiKey}` },
            cache: 'no-store'
          });
          if (listRes.ok) {
            const listData = await listRes.json();
            const candidate = (listData.data || []).find((item: any) => item.message_id === messageId);
            if (candidate?.id) {
              const single = await fetch(`https://api.resend.com/emails/receiving/${candidate.id}`, {
                headers: { 'Authorization': `Bearer ${apiKey}` },
                cache: 'no-store'
              });
              if (single.ok) fetched = await single.json();
            }
          }
        }
        if (fetched) {
          textBody = fetched.text || fetched.html || '';
          formEntries['text'] = fetched.text || textBody;
          if (fetched.html) formEntries['html'] = fetched.html;
          break;
        }
      } catch (err: any) {
        console.warn('[INBOUND] Secondary Resend retrieval in endpointService error:', err.message);
      }
    }
  }

  const stripped = textBody
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const normalizedMessage = stripped.length > 500 ? stripped.substring(0, 497) + '...' : stripped;

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

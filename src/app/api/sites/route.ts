import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const siteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().max(200).optional(),
  customerId: z.string().min(1, 'Customer is required'),
});

export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();
  const [{ data: sites }, { data: endpoints }, { data: links }] = await Promise.all([
    supabase
      .from('Site')
      .select('*, customer:Customer(name)')
      .eq('companyId', ctx.companyId)
      .order('name', { ascending: true }),
    supabase
      .from('InboundEndpoint')
      .select('id, siteId')
      .eq('companyId', ctx.companyId),
    supabase
      .from('EndpointRecipient')
      .select('endpointId, recipientId'),
  ]);

  // Map endpointId to siteId and count endpoints per site
  const endpointSiteMap = new Map<string, string>();
  const siteEndpointsCount = new Map<string, number>();
  (endpoints || []).forEach((ep: any) => {
    if (ep.siteId) {
      endpointSiteMap.set(ep.id, ep.siteId);
      siteEndpointsCount.set(ep.siteId, (siteEndpointsCount.get(ep.siteId) || 0) + 1);
    }
  });

  // Map siteId to set of unique recipientIds
  const siteRecipientsMap = new Map<string, Set<string>>();
  (links || []).forEach((link: any) => {
    const siteId = endpointSiteMap.get(link.endpointId);
    if (siteId && link.recipientId) {
      if (!siteRecipientsMap.has(siteId)) {
        siteRecipientsMap.set(siteId, new Set());
      }
      siteRecipientsMap.get(siteId)!.add(link.recipientId);
    }
  });

  const mappedSites = (sites || []).map((s: any) => {
    return {
      ...s,
      _count: {
        endpoints: siteEndpointsCount.get(s.id) || 0,
        recipients: siteRecipientsMap.get(s.id)?.size || 0,
      },
    };
  });

  return NextResponse.json({ data: mappedSites });
}

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const { name, address, customerId } = siteSchema.parse(body);

    const supabase = getAdminClient();
    const { getSubscriptionUsage } = await import('@/services/endpointService');
    const usage = await getSubscriptionUsage(ctx.companyId);

    if (!usage.isSubscriptionActive) {
      return NextResponse.json({ error: 'Your subscription is not active or your free trial has ended. Please upgrade in Billing.', code: 'SUBSCRIPTION_INACTIVE' }, { status: 403 });
    }

    if (usage.isTrial && usage.activeSitesCount >= 1) {
      return NextResponse.json({ error: 'Free trial includes 1 active site. Please subscribe to add more sites.', code: 'TRIAL_LIMIT_EXCEEDED' }, { status: 403 });
    }

    // Verify customer belongs to this company
    const { data: customer } = await supabase
      .from('Customer')
      .select('*')
      .eq('id', customerId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const { data: site } = await supabase
      .from('Site')
      .insert({ companyId: ctx.companyId, customerId, name, address })
      .select()
      .single();

    if (!site) throw new Error('Failed to create site');

    // Update activeSites count in CompanySubscription
    const newSiteCount = (usage.activeSitesCount || 0) + 1;
    await supabase
      .from('CompanySubscription')
      .update({ activeSites: newSiteCount })
      .eq('companyId', ctx.companyId);

    // Sync quantity with active Stripe subscription if present
    const { stripe, isStripeConfigured } = await import('@/lib/stripe');
    if (usage.subscription?.stripeSubscriptionId && !usage.subscription.stripeSubscriptionId.startsWith('mock_') && isStripeConfigured()) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(usage.subscription.stripeSubscriptionId);
        const sitePriceId = process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
        const siteItem = stripeSub.items.data.find((it: any) => it.price.id === sitePriceId);
        if (siteItem) {
          await stripe.subscriptionItems.update(siteItem.id, {
            quantity: newSiteCount,
            proration_behavior: 'always_invoice',
          });
        }
      } catch (stripeErr: any) {
        console.warn('Could not sync Stripe quantity on site creation:', stripeErr.message);
      }
    }

    await auditLog(ctx, 'CREATE_SITE', 'Site', site.id, { name, customerId, newSiteCount });

    return NextResponse.json({ data: site }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
  }

  try {
    const { newSitesCount, newExtraEndpointsCount } = await req.json();

    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
    }

    const supabase = getAdminClient();
    const { data: sub } = await supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', ctx.companyId)
      .single();

    if (!sub || !sub.stripeSubscriptionId || sub.stripeSubscriptionId.startsWith('mock_')) {
      return NextResponse.json({ error: 'No active Stripe subscription found' }, { status: 400 });
    }

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

    const sitePriceId = process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
    const extraPriceId = process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UGi0d33lejKAXgDsWnNcIH4';

    let existingSiteItem = null;
    let existingExtraItem = null;

    for (const item of stripeSub.items.data) {
      if (item.price.id === sitePriceId || (item.price.recurring as any)?.tiers_mode === 'volume') {
        existingSiteItem = item;
      } else if (item.price.id === extraPriceId) {
        existingExtraItem = item;
      }
    }

    const subscription_items: any[] = [];
    let prorationDate = Math.floor(Date.now() / 1000);

    if (newSitesCount !== undefined && existingSiteItem) {
      subscription_items.push({
        id: existingSiteItem.id,
        quantity: newSitesCount,
      });
    }

    if (newExtraEndpointsCount !== undefined) {
      if (existingExtraItem) {
        subscription_items.push({
          id: existingExtraItem.id,
          quantity: newExtraEndpointsCount,
          ...(newExtraEndpointsCount === 0 ? { deleted: true } : {})
        });
      } else if (newExtraEndpointsCount > 0) {
        subscription_items.push({
          price: extraPriceId,
          quantity: newExtraEndpointsCount,
        });
      }
    }

    // Retrieve upcoming invoice to see proration
    const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
      customer: sub.stripeCustomerId,
      subscription: sub.stripeSubscriptionId,
      subscription_proration_date: prorationDate,
      subscription_items: subscription_items.length > 0 ? subscription_items : undefined,
    });

    // Calculate amount due today (prorated amount for the new items)
    // The upcoming invoice calculates what will be charged on the NEXT cycle, PLUS any immediate proration if always_invoice was used.
    // Wait, retrieveUpcoming computes the invoice if the billing cycle closed NOW, or what the next invoice will look like.
    // Proration line items are added to the next invoice.
    
    // Sum the amounts of all proration line items
    let amountDueToday = 0;
    const prorationPeriod = { start: null as number | null, end: null as number | null };

    for (const line of upcomingInvoice.lines.data) {
      if (line.proration) {
        amountDueToday += line.amount;
        if (!prorationPeriod.start || line.period.start < prorationPeriod.start) {
          prorationPeriod.start = line.period.start;
        }
        if (!prorationPeriod.end || line.period.end > prorationPeriod.end) {
          prorationPeriod.end = line.period.end;
        }
      }
    }

    // If negative (credit), amount due today is 0.
    if (amountDueToday < 0) {
      amountDueToday = 0;
    }

    // New estimated recurring monthly total (sum of all non-proration line items for the subscription)
    let newRecurringTotal = 0;
    for (const line of upcomingInvoice.lines.data) {
      if (!line.proration && line.type === 'subscription') {
        newRecurringTotal += line.amount;
      }
    }

    const nextBillingDate = upcomingInvoice.next_payment_attempt || upcomingInvoice.period_end;

    return NextResponse.json({
      amountDueTodayCents: amountDueToday,
      newRecurringTotalCents: newRecurringTotal,
      prorationPeriodStart: prorationPeriod.start,
      prorationPeriodEnd: prorationPeriod.end,
      nextBillingDate,
    });

  } catch (err: any) {
    console.error('Error in preview-proration:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

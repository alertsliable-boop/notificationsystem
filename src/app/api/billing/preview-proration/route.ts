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

    // Retrieve upcoming preview invoice
    let upcomingInvoice: any = null;
    try {
      if (typeof (stripe.invoices as any).createPreview === 'function') {
        upcomingInvoice = await (stripe.invoices as any).createPreview({
          customer: sub.stripeCustomerId,
          subscription: sub.stripeSubscriptionId,
          subscription_details: {
            items: subscription_items.length > 0 ? subscription_items : undefined,
            proration_date: prorationDate,
          },
        });
      } else {
        upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
          customer: sub.stripeCustomerId,
          subscription: sub.stripeSubscriptionId,
          subscription_proration_date: prorationDate,
          subscription_items: subscription_items.length > 0 ? subscription_items : undefined,
        });
      }
    } catch (previewErr: any) {
      console.warn('Stripe createPreview failed, attempting direct retrieveUpcoming:', previewErr.message);
      try {
        upcomingInvoice = await (stripe.invoices as any).retrieveUpcoming({
          customer: sub.stripeCustomerId,
          subscription: sub.stripeSubscriptionId,
          subscription_proration_date: prorationDate,
          subscription_items: subscription_items.length > 0 ? subscription_items : undefined,
        });
      } catch (fallbackErr: any) {
        // If Stripe preview fails, calculate mathematical proration based on days remaining in period
        const periodStartSec = stripeSub.current_period_start || (Date.now() / 1000);
        const periodEndSec = stripeSub.current_period_end || (periodStartSec + 30 * 86400);
        const totalSec = Math.max(1, periodEndSec - periodStartSec);
        const remainingSec = Math.max(0, periodEndSec - prorationDate);
        const fraction = remainingSec / totalSec;

        let diffCents = 0;
        let newMonthlyCents = 0;

        // Current costs
        const currSites = existingSiteItem ? (existingSiteItem.quantity || 1) : 1;
        const currExtra = existingExtraItem ? (existingExtraItem.quantity || 0) : 0;
        const targetSites = newSitesCount !== undefined ? newSitesCount : currSites;
        const targetExtra = newExtraEndpointsCount !== undefined ? newExtraEndpointsCount : currExtra;

        const getSiteUnitCents = (q: number) => {
          if (q >= 50) return 3400;
          if (q >= 25) return 3900;
          if (q >= 10) return 4400;
          return 4900;
        };

        const oldSiteCost = currSites * getSiteUnitCents(currSites);
        const newSiteCost = targetSites * getSiteUnitCents(targetSites);
        const oldExtraCost = currExtra * 1500;
        const newExtraCost = targetExtra * 1500;

        newMonthlyCents = newSiteCost + newExtraCost;
        const deltaMonthlyCents = (newSiteCost - oldSiteCost) + (newExtraCost - oldExtraCost);
        diffCents = Math.max(0, Math.round(deltaMonthlyCents * fraction));

        return NextResponse.json({
          amountDueTodayCents: diffCents,
          newRecurringTotalCents: newMonthlyCents,
          prorationPeriodStart: prorationDate,
          prorationPeriodEnd: periodEndSec,
          nextBillingDate: periodEndSec,
        });
      }
    }

    // Sum the amounts of all proration line items
    let amountDueToday = 0;
    const prorationPeriod = { start: null as number | null, end: null as number | null };

    const lines = upcomingInvoice?.lines?.data || [];
    for (const line of lines) {
      if (line.proration) {
        amountDueToday += line.amount;
        if (!prorationPeriod.start || line.period?.start < prorationPeriod.start) {
          prorationPeriod.start = line.period?.start;
        }
        if (!prorationPeriod.end || line.period?.end > prorationPeriod.end) {
          prorationPeriod.end = line.period?.end;
        }
      }
    }

    // If negative (credit/downgrade), amount due today is 0 (no immediate refunds)
    if (amountDueToday < 0) {
      amountDueToday = 0;
    }

    // New estimated recurring monthly total (sum of all non-proration line items)
    let newRecurringTotal = 0;
    for (const line of lines) {
      if (!line.proration && (line.type === 'subscription' || line.price)) {
        newRecurringTotal += line.amount;
      }
    }

    if (newRecurringTotal === 0 && upcomingInvoice?.total) {
      newRecurringTotal = Math.max(0, upcomingInvoice.total - amountDueToday);
    }

    const nextBillingDate = upcomingInvoice?.next_payment_attempt || upcomingInvoice?.period_end || stripeSub.current_period_end;

    return NextResponse.json({
      amountDueTodayCents: amountDueToday,
      newRecurringTotalCents: newRecurringTotal,
      prorationPeriodStart: prorationPeriod.start || prorationDate,
      prorationPeriodEnd: prorationPeriod.end || stripeSub.current_period_end,
      nextBillingDate,
    });


  } catch (err: any) {
    console.error('Error in preview-proration:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

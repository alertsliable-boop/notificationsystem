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

    // Calculate mathematical proration based on days remaining in period
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

    const getSiteTotalCents = (q: number) => {
      let rate = 4900;
      if (q >= 50) rate = 3400;
      else if (q >= 25) rate = 3900;
      else if (q >= 10) rate = 4400;
      
      let total = q * rate;
      if (q >= 10 && q < 25) total = Math.max(total, 9 * 4900);
      if (q >= 25 && q < 50) total = Math.max(total, 24 * 4400);
      if (q >= 50) total = Math.max(total, 49 * 3900);
      return total;
    };

    const oldSiteCost = getSiteTotalCents(currSites);
    const newSiteCost = getSiteTotalCents(targetSites);
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


  } catch (err: any) {
    console.error('Error in preview-proration:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

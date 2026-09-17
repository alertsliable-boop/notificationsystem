import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  planCode: z.string().optional().default('site_starter'),
  activeSites: z.number().int().positive().optional(),
  extraEndpoints: z.number().int().nonnegative().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const { planCode, activeSites: inputSites, extraEndpoints: inputExtra } = schema.parse(body);

    const supabase = getAdminClient();
    const { data: plan } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('code', planCode)
      .single();

    // Fallback to site_starter if code wasn't found
    const targetPlan = plan || (await supabase.from('SubscriptionPlan').select('*').eq('code', 'site_starter').single()).data;

    // Check if Stripe environment variables are configured
    if (!isStripeConfigured()) {
      return NextResponse.json(
        {
          mode: 'mock',
          message: 'Stripe API key not configured. Billing switched instantly via system.',
          planCode,
        },
        { status: 200 }
      );
    }

    const { count: actualSitesCount } = await supabase
      .from('Site')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', ctx.companyId);

    const { data: subscription } = await supabase
      .from('CompanySubscription')
      .select('*')
      .eq('companyId', ctx.companyId)
      .single();

    const { data: user } = await supabase
      .from('User')
      .select('email, name')
      .eq('id', ctx.userId)
      .single();

    const siteQty = inputSites || Math.max(1, actualSitesCount || subscription?.activeSites || 1);
    const extraQty = inputExtra !== undefined ? inputExtra : (subscription?.extraEndpoints || 0);

    const sitePriceId = targetPlan?.stripePriceId || process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
    const extraPriceId = process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UGi0d33lejKAXgDsWnNcIH4';

    const line_items: any[] = [
      {
        price: sitePriceId,
        quantity: siteQty,
      },
    ];

    if (extraQty > 0) {
      line_items.push({
        price: extraPriceId,
        quantity: extraQty,
      });
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: subscription?.stripeCustomerId || undefined,
      customer_email: !subscription?.stripeCustomerId ? (user?.email || undefined) : undefined,
      line_items,
      client_reference_id: ctx.companyId,
      metadata: {
        companyId: ctx.companyId,
        planCode: targetPlan?.code || planCode,
        planId: targetPlan?.id || '',
        activeSites: String(siteQty),
        extraEndpoints: String(extraQty),
      },
      subscription_data: {
        metadata: {
          companyId: ctx.companyId,
          planCode: targetPlan?.code || planCode,
          planId: targetPlan?.id || '',
          activeSites: String(siteQty),
          extraEndpoints: String(extraQty),
        },
      },
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/billing?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error creating Stripe checkout session:', err);
    return NextResponse.json({ error: err.message || 'Stripe checkout error' }, { status: 500 });
  }
}

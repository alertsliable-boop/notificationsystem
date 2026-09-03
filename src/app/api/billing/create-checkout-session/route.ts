import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';

const schema = z.object({
  planCode: z.string(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  try {
    const body = await req.json();
    const { planCode } = schema.parse(body);

    const supabase = getAdminClient();
    const { data: plan } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('code', planCode)
      .single();

    if (!plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

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

    const { data: company } = await supabase
      .from('Company')
      .select('*')
      .eq('id', ctx.companyId)
      .single();

    const { data: subscription } = await supabase
      .from('CompanySubscription')
      .select('*')
      .eq('companyId', ctx.companyId)
      .single();

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: ctx.companyId,
      metadata: {
        companyId: ctx.companyId,
        planCode: plan.code,
        planId: plan.id,
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

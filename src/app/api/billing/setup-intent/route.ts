import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage billing.' }, { status: 403 });
  }

  if (!isStripeConfigured()) {
    return NextResponse.json({
      error: 'Stripe is not configured on this environment.',
      mode: 'mock',
    }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    // Fetch company & subscription
    const [{ data: company }, { data: sub }, { data: user }] = await Promise.all([
      supabase.from('Company').select('*').eq('id', ctx.companyId).single(),
      supabase.from('CompanySubscription').select('*').eq('companyId', ctx.companyId).single(),
      supabase.from('User').select('email, name').eq('id', ctx.userId).single(),
    ]);

    let stripeCustomerId = sub?.stripeCustomerId;

    // Ensure Stripe customer exists
    if (!stripeCustomerId) {
      const newCust = await stripe.customers.create({
        name: company?.name || user?.name || 'Workspace Customer',
        email: sub?.billingEmail || user?.email || undefined,
        metadata: { companyId: ctx.companyId },
      });
      stripeCustomerId = newCust.id;

      if (sub) {
        await supabase
          .from('CompanySubscription')
          .update({ stripeCustomerId })
          .eq('id', sub.id);
      } else {
        await supabase
          .from('CompanySubscription')
          .insert({
            companyId: ctx.companyId,
            planId: 'plan_starter_1',
            status: 'ACTIVE',
            stripeCustomerId,
          });
      }
    }

    // Create a SetupIntent for securely collecting card details
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        companyId: ctx.companyId,
        userId: ctx.userId,
      },
    });

    const publishableKey =
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
      process.env.STRIPE_PUBLISHABLE_KEY ||
      null;

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      publishableKey,
      customerId: stripeCustomerId,
    });
  } catch (err: any) {
    console.error('[Stripe SetupIntent Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to initialize card setup' }, { status: 500 });
  }
}

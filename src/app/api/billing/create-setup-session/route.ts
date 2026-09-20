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

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      success_url: `${origin}/billing?setup_success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?setup_cancelled=true`,
      metadata: {
        companyId: ctx.companyId,
        userId: ctx.userId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('[Stripe Create Setup Session Error]', err);
    return NextResponse.json({ error: err.message || 'Failed to create setup session' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const schema = z.object({
  planCode: z.string(),
  activeSites: z.number().int().positive().optional(),
  deactivateEndpointIds: z.array(z.string()).optional(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage subscriptions.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { planCode, activeSites: inputActiveSites, deactivateEndpointIds = [] } = schema.parse(body);

    if (planCode === 'superadmin_owner' || planCode === 'free_trial') {
      return NextResponse.json({ error: 'This plan is not available for direct subscription.' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch target plan
    const { data: newPlan } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('code', planCode)
      .single();

    if (!newPlan) {
      return NextResponse.json({ error: 'Invalid subscription plan code' }, { status: 400 });
    }

    // Handle any user-specified endpoint deactivations if provided
    if (deactivateEndpointIds.length > 0) {
      for (const epId of deactivateEndpointIds) {
        await supabase
          .from('InboundEndpoint')
          .update({ status: 'INACTIVE' })
          .eq('id', epId)
          .eq('companyId', ctx.companyId);
      }
    }

    // Fetch current active endpoints count
    const { count: activeCount } = await supabase
      .from('InboundEndpoint')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', ctx.companyId)
      .eq('status', 'ACTIVE');

    const currentActiveCount = activeCount || 0;
    const baseMax = newPlan.maxActiveEndpoints;

    // Look up current subscription
    const { data: currentSub } = await supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', ctx.companyId)
      .single();

    // If active endpoints exceed new base plan, automatically retain excess as $12 add-ons
    let extraEndpoints = currentSub?.extraEndpoints || 0;
    if (currentActiveCount > baseMax) {
      extraEndpoints = Math.max(extraEndpoints, currentActiveCount - baseMax);
    }

    const newActiveSites = inputActiveSites ?? Math.max(1, currentSub?.activeSites || 1);
    const isUpgrade = newPlan.priceCents > (currentSub?.plan?.priceCents || 0) || newActiveSites > (currentSub?.activeSites || 1);

    // If company already has an active, paying Stripe subscription, update it directly via Stripe API
    let updatedViaStripe = false;
    let stripeErrorMsg = '';

    if (currentSub?.stripeSubscriptionId && !currentSub.stripeSubscriptionId.startsWith('mock_') && isStripeConfigured()) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId);

        if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
          const sitePriceId = process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
          const siteItem = stripeSub.items.data.find(
            (it: any) => it.price.id === sitePriceId || (it.price.recurring as any)?.tiers_mode === 'volume'
          ) || stripeSub.items.data[0];

          const updatedSubscription = await stripe.subscriptions.update(stripeSub.id, {
            items: [{ id: siteItem.id, price: newPlan.stripePriceId || undefined, quantity: newActiveSites }],
            proration_behavior: isUpgrade ? 'always_invoice' : 'none',
            payment_behavior: isUpgrade ? 'error_if_incomplete' : 'allow_incomplete',
            expand: ['latest_invoice.payment_intent'],
            metadata: {
              planCode: newPlan.code,
              planId: newPlan.id,
              activeSites: String(newActiveSites),
            },
          });

          // Record latest invoice/receipt in BillingInvoice table if generated and paid
          if (updatedSubscription.latest_invoice && typeof updatedSubscription.latest_invoice === 'object') {
            const inv = updatedSubscription.latest_invoice as any;
            if (inv.amount_paid > 0 || inv.status === 'paid') {
              await supabase.from('BillingInvoice').upsert({
                id: nanoid(),
                companyId: ctx.companyId,
                stripeInvoiceId: inv.id,
                invoiceNumber: inv.number || `REC-${inv.id.slice(-8).toUpperCase()}`,
                amountCents: inv.amount_paid || inv.total || 0,
                currency: inv.currency || 'usd',
                status: 'paid',
                description: `Prorated update: ${newActiveSites} Sites (${newPlan.name})`,
                cardBrand: currentSub.cardBrand || 'Card',
                cardLast4: currentSub.cardLast4 || '••••',
                pdfUrl: inv.invoice_pdf || null,
                createdAt: new Date().toISOString(),
              }, { onConflict: 'stripeInvoiceId' });
            }
          }

          updatedViaStripe = true;
        }
      } catch (err: any) {
        console.error('[SWITCH_PLAN] Stripe subscription update error:', err.message);
        stripeErrorMsg = err.message || 'Payment method failed';
        if (isUpgrade) {
          // If it was an upgrade and payment failed, do NOT proceed or give free capacity!
          return NextResponse.json(
            { error: `Payment failed: ${stripeErrorMsg}. Your current subscription remains active. Please update your card in Billing.` },
            { status: 402 }
          );
        }
      }
    }

    // If already updated via existing active Stripe subscription, sync local DB and return success
    if (updatedViaStripe) {
      let updatedSub = null;
      if (currentSub) {
        const { data } = await supabase
          .from('CompanySubscription')
          .update({
            planId: newPlan.id,
            activeSites: newActiveSites,
            extraEndpoints,
            status: 'ACTIVE',
          })
          .eq('id', currentSub.id)
          .select('*, plan:SubscriptionPlan(*)')
          .single();
        updatedSub = data;
      }

      await auditLog(ctx, 'SWITCH_PLAN', 'CompanySubscription', currentSub?.id || ctx.companyId, {
        previousPlan: currentSub?.plan?.code,
        newPlan: newPlan.code,
        activeSites: newActiveSites,
        extraEndpoints,
        isUpgrade,
      });

      return NextResponse.json({
        success: true,
        data: updatedSub,
        message: `Successfully updated subscription to ${newActiveSites} site${newActiveSites > 1 ? 's' : ''}!`,
      });
    }

    let validCustomerId = currentSub?.stripeCustomerId || null;

    // If company has a Stripe customer ID with saved default payment method, attempt direct charge/subscription
    if (validCustomerId && isStripeConfigured() && newPlan.stripePriceId) {
      try {
        const customer = await stripe.customers.retrieve(validCustomerId, {
          expand: ['invoice_settings.default_payment_method'],
        }) as any;

        if (customer?.deleted) {
          validCustomerId = null;
        } else {
          const defaultPm = customer?.invoice_settings?.default_payment_method;
          if (defaultPm) {
            const directLineItems: any[] = [{ price: newPlan.stripePriceId, quantity: newActiveSites }];
            if (extraEndpoints > 0) {
              directLineItems.push({ price: process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UKgNO3qW08is206blcatghC', quantity: extraEndpoints });
            }

            const newStripeSub = await stripe.subscriptions.create({
              customer: validCustomerId,
              items: directLineItems,
              default_payment_method: typeof defaultPm === 'string' ? defaultPm : defaultPm.id,
              metadata: {
                companyId: ctx.companyId,
                planCode: newPlan.code,
                planId: newPlan.id,
                extraEndpoints: String(extraEndpoints),
              },
            });

            if (newStripeSub.status === 'active' || newStripeSub.status === 'trialing') {
              const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
              const { data: updatedSub } = await supabase
                .from('CompanySubscription')
                .update({
                  planId: newPlan.id,
                  activeSites: newActiveSites,
                  extraEndpoints,
                  status: 'ACTIVE',
                  stripeSubscriptionId: newStripeSub.id,
                  currentPeriodEnd,
                })
                .eq('id', currentSub.id)
                .select('*, plan:SubscriptionPlan(*)')
                .single();

              await auditLog(ctx, 'SWITCH_PLAN', 'CompanySubscription', currentSub.id, {
                previousPlan: currentSub?.plan?.code,
                newPlan: newPlan.code,
                extraEndpoints,
                isUpgrade,
                directCard: true,
              });

              return NextResponse.json({
                success: true,
                data: updatedSub,
                message: `Successfully switched to ${newPlan.name} Plan!`,
              });
            }
          }
        }
      } catch (directErr: any) {
        console.warn('Direct subscription using saved card failed:', directErr.message);
        // If customer ID doesn't exist in this Stripe mode (e.g. was created in live mode), reset it
        if (directErr.code === 'resource_missing' || directErr.message?.includes('No such customer')) {
          validCustomerId = null;
          await supabase
            .from('CompanySubscription')
            .update({
              stripeCustomerId: null,
              stripeSubscriptionId: null,
              cardBrand: null,
              cardLast4: null,
              cardExpMonth: null,
              cardExpYear: null,
            })
            .eq('id', currentSub.id);
        }
      }
    }

    // Otherwise (new subscriber, free trial, or no saved payment method), create a Stripe Checkout Session!
    if (!isStripeConfigured()) {
      return NextResponse.json(
        { error: 'Payment processing is temporarily unavailable. Please contact support.' },
        { status: 503 }
      );
    }

    if (!newPlan.stripePriceId) {
      return NextResponse.json(
        { error: `The ${newPlan.name} plan does not have an active Stripe price.` },
        { status: 400 }
      );
    }

    const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'https://liablealerts.com';

    // Build line items (base plan + any extra endpoints)
    const line_items: any[] = [
      {
        price: newPlan.stripePriceId,
        quantity: newActiveSites,
      },
    ];

    if (extraEndpoints > 0) {
      line_items.push({
        price: process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UKgNO3qW08is206blcatghC',
        quantity: extraEndpoints,
      });
    }

    // Look up user email
    const { data: user } = await supabase
      .from('User')
      .select('email, name')
      .eq('id', ctx.userId)
      .single();

    const customerEmail = user?.email || (ctx as any).email || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: validCustomerId || undefined,
      customer_email: !validCustomerId ? customerEmail : undefined,
      line_items,
      ...( { managed_payments: { enabled: false } } as any ),
      client_reference_id: ctx.companyId,
      metadata: {
        companyId: ctx.companyId,
        planCode: newPlan.code,
        planId: newPlan.id,
        extraEndpoints: String(extraEndpoints),
      },
      subscription_data: {
        metadata: {
          companyId: ctx.companyId,
          planCode: newPlan.code,
          planId: newPlan.id,
          extraEndpoints: String(extraEndpoints),
        },
      },
      success_url: `${origin}/billing?session_id={CHECKOUT_SESSION_ID}&status=success`,
      cancel_url: `${origin}/billing?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    console.error('Error switching plan:', err);
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

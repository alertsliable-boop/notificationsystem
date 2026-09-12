import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const schema = z.object({
  planCode: z.string(),
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
    const { planCode, deactivateEndpointIds = [] } = schema.parse(body);

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

    const isUpgrade = newPlan.priceCents > (currentSub?.plan?.priceCents || 0);

    // If company already has an active Stripe subscription, update it via Stripe API
    if (currentSub?.stripeSubscriptionId && !currentSub.stripeSubscriptionId.startsWith('mock_') && isStripeConfigured()) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(currentSub.stripeSubscriptionId);

        if (stripeSub.status === 'active' || stripeSub.status === 'trialing') {
          const subItemId = stripeSub.items.data[0].id;

          await stripe.subscriptions.update(stripeSub.id, {
            items: [{ id: subItemId, price: newPlan.stripePriceId || undefined }],
            proration_behavior: isUpgrade ? 'always_invoice' : 'none',
            metadata: {
              planCode: newPlan.code,
              planId: newPlan.id,
            },
          });
        }
      } catch (err: any) {
        console.warn('Could not update Stripe subscription, updating local records:', err.message);
      }
    }

    // Update CompanySubscription immediately in database
    let updatedSub = null;
    if (currentSub) {
      const { data } = await supabase
        .from('CompanySubscription')
        .update({
          planId: newPlan.id,
          extraEndpoints,
          status: 'ACTIVE',
        })
        .eq('id', currentSub.id)
        .select('*, plan:SubscriptionPlan(*)')
        .single();
      updatedSub = data;
    } else {
      const { data } = await supabase
        .from('CompanySubscription')
        .insert({
          companyId: ctx.companyId,
          planId: newPlan.id,
          extraEndpoints,
          status: 'ACTIVE',
        })
        .select('*, plan:SubscriptionPlan(*)')
        .single();
      updatedSub = data;
    }

    // Record billing invoice entry for the change
    await supabase
      .from('BillingInvoice')
      .insert({
        id: nanoid(),
        companyId: ctx.companyId,
        invoiceNumber: `INV-SUB-${nanoid(6).toUpperCase()}`,
        amountCents: newPlan.priceCents + (extraEndpoints * 1200),
        currency: 'usd',
        status: 'paid',
        description: `Plan Switch to ${newPlan.name} Plan (${baseMax} endpoints)${extraEndpoints > 0 ? ` + ${extraEndpoints} Extra Endpoint(s)` : ''}`,
        cardBrand: currentSub?.cardBrand || 'Card',
        cardLast4: currentSub?.cardLast4 || '••••',
        createdAt: new Date().toISOString(),
      });

    await auditLog(ctx, 'SWITCH_PLAN', 'CompanySubscription', currentSub?.id || ctx.companyId, {
      previousPlan: currentSub?.plan?.code,
      newPlan: newPlan.code,
      extraEndpoints,
      isUpgrade,
    });

    return NextResponse.json({
      success: true,
      data: updatedSub,
      message: `Successfully switched to ${newPlan.name} Plan!`,
    });
  } catch (err: any) {
    console.error('Error switching plan:', err);
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

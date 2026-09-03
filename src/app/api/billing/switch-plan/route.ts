import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  planCode: z.string(),
  deactivateEndpointIds: z.array(z.string()).optional(),
  autoDeactivate: z.boolean().optional(),
});

export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage subscriptions.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { planCode, deactivateEndpointIds = [], autoDeactivate = false } = schema.parse(body);

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

    // Fetch current active endpoints for company
    const { data: activeEndpoints } = await supabase
      .from('InboundEndpoint')
      .select('id, label, localPart, createdAt, domain:Domain(hostname)')
      .eq('companyId', ctx.companyId)
      .eq('status', 'ACTIVE')
      .order('createdAt', { ascending: false });

    const currentActiveCount = activeEndpoints?.length || 0;
    const maxAllowed = newPlan.maxActiveEndpoints;

    // Check if downgrade requires deactivating endpoints
    if (currentActiveCount > maxAllowed) {
      const requiredToDeactivate = currentActiveCount - maxAllowed;

      // Handle user-specified endpoint deactivations first
      if (deactivateEndpointIds.length > 0) {
        for (const epId of deactivateEndpointIds) {
          await supabase
            .from('InboundEndpoint')
            .update({ status: 'INACTIVE' })
            .eq('id', epId)
            .eq('companyId', ctx.companyId);
        }
      }

      // Re-check count after processing explicit deactivations
      const { count: newActiveCount } = await supabase
        .from('InboundEndpoint')
        .select('*', { count: 'exact', head: true })
        .eq('companyId', ctx.companyId)
        .eq('status', 'ACTIVE');

      if ((newActiveCount || 0) > maxAllowed) {
        if (autoDeactivate) {
          // Auto-deactivate oldest active endpoints to fit into new plan limit
          const { data: remainingActive } = await supabase
            .from('InboundEndpoint')
            .select('id')
            .eq('companyId', ctx.companyId)
            .eq('status', 'ACTIVE')
            .order('createdAt', { ascending: true }) // Deactivate oldest
            .limit((newActiveCount || 0) - maxAllowed);

          if (remainingActive && remainingActive.length > 0) {
            for (const ep of remainingActive) {
              await supabase
                .from('InboundEndpoint')
                .update({ status: 'INACTIVE' })
                .eq('id', ep.id);
            }
          }
        } else {
          // Require user selection in UI
          return NextResponse.json(
            {
              error: `Your account currently has ${currentActiveCount} active email accounts, but the ${newPlan.name} plan allows a maximum of ${maxAllowed}. Please select ${requiredToDeactivate} endpoint(s) to deactivate before completing the downgrade.`,
              code: 'DOWNGRADE_REDUNDANT_ENDPOINTS',
              activeEndpoints,
              requiredDeactivations: requiredToDeactivate,
              maxAllowed,
            },
            { status: 422 }
          );
        }
      }
    }

    // Look up company to check for existing customer ID if any
    const { data: company } = await supabase
      .from('Company')
      .select('*')
      .eq('id', ctx.companyId)
      .single();

    // Check if Stripe is configured
    const { stripe, isStripeConfigured } = await import('@/lib/stripe');
    if (!isStripeConfigured()) {
      return NextResponse.json({ error: 'Stripe is not configured in this environment.' }, { status: 500 });
    }

    if (!newPlan.stripePriceId) {
      return NextResponse.json({ error: 'Selected plan is missing a Stripe Price ID.' }, { status: 400 });
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      managed_payments: { enabled: false },
      line_items: [
        {
          price: newPlan.stripePriceId,
          quantity: 1,
        },
      ],
      client_reference_id: ctx.companyId,
      metadata: {
        companyId: ctx.companyId,
        planCode: newPlan.code,
        planId: newPlan.id,
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

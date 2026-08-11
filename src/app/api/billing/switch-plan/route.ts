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

    // Upsert subscription
    let { data: subscription } = await supabase
      .from('CompanySubscription')
      .select('*')
      .eq('companyId', ctx.companyId)
      .single();

    if (subscription) {
      const { data: updated } = await supabase
        .from('CompanySubscription')
        .update({
          planId: newPlan.id,
          status: 'ACTIVE',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('companyId', ctx.companyId)
        .select('*, plan:SubscriptionPlan(*)')
        .single();
      subscription = updated;
    } else {
      const { data: inserted } = await supabase
        .from('CompanySubscription')
        .insert({
          companyId: ctx.companyId,
          planId: newPlan.id,
          status: 'ACTIVE',
          stripeSubscriptionId: `mock_sub_${Date.now()}`,
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select('*, plan:SubscriptionPlan(*)')
        .single();
      subscription = inserted;
    }

    if (!subscription) throw new Error('Failed to update subscription');

    await auditLog(ctx, 'SWITCH_PLAN', 'CompanySubscription', subscription.id, {
      planCode,
      maxEndpoints: newPlan.maxActiveEndpoints,
    });

    return NextResponse.json({ success: true, data: subscription });
  } catch (err: any) {
    console.error('Error switching plan:', err);
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

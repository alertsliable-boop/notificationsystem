import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';
import { nanoid } from 'nanoid';

const schema = z.object({
  targetSites: z.number().int().positive(),
  siteIdToDeactivate: z.string().min(1, 'A site to deactivate must be selected'),
});

/**
 * POST /api/billing/schedule-downgrade
 *
 * Schedules a subscription downgrade to take effect at the next billing period.
 *
 * Rules:
 * - Does NOT immediately deactivate any site
 * - Does NOT trigger an immediate Stripe charge
 * - Does NOT issue a prorated refund
 * - Validates that the selected site belongs to this organization
 * - Stores the scheduled downgrade server-side
 * - The worker/cron job will apply it at the next billing date
 */
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage subscriptions.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { targetSites, siteIdToDeactivate } = schema.parse(body);

    const supabase = getAdminClient();

    // Load current subscription
    const { data: currentSub } = await supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', ctx.companyId)
      .single();

    if (!currentSub) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 });
    }

    const currentSites = currentSub.activeSites || 1;

    // Validate: this must be a downgrade
    if (targetSites >= currentSites) {
      return NextResponse.json(
        { error: 'Target site count must be less than current site count for a downgrade.' },
        { status: 400 }
      );
    }

    // Validate: exactly one site must be removed for 1-site reductions
    // For multi-site reductions (e.g. 4→1), caller provides the one primary site to deactivate
    // (other sites will need to be handled by the worker, but we require at least one)
    if (!siteIdToDeactivate) {
      return NextResponse.json(
        { error: 'A site must be selected for deactivation.' },
        { status: 400 }
      );
    }

    // Validate: selected site belongs to this organization
    const { data: site } = await supabase
      .from('Site')
      .select('id, name, customerId')
      .eq('id', siteIdToDeactivate)
      .eq('companyId', ctx.companyId)
      .single();

    if (!site) {
      return NextResponse.json(
        { error: 'Selected site not found or does not belong to this account.' },
        { status: 404 }
      );
    }

    // Validate: no duplicate downgrade already scheduled
    if (currentSub.scheduledDowngrade) {
      return NextResponse.json(
        {
          error:
            'A downgrade is already scheduled. Cancel the existing scheduled downgrade before scheduling a new one.',
        },
        { status: 409 }
      );
    }

    // Get next billing date from subscription
    const nextBillingDate = currentSub.currentPeriodEnd
      ? new Date(currentSub.currentPeriodEnd).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Store the scheduled downgrade server-side (no immediate Stripe change)
    await supabase
      .from('CompanySubscription')
      .update({
        scheduledDowngrade: true,
        scheduledDowngradeSites: targetSites,
        scheduledDowngradeSiteId: siteIdToDeactivate,
        scheduledDowngradeDate: nextBillingDate,
        scheduledDowngradeBy: ctx.userId,
        scheduledDowngradeAt: new Date().toISOString(),
      })
      .eq('id', currentSub.id);

    await auditLog(ctx, 'SCHEDULE_DOWNGRADE', 'CompanySubscription', currentSub.id, {
      previousSites: currentSites,
      targetSites,
      siteIdToDeactivate,
      siteName: site.name,
      effectiveDate: nextBillingDate,
      scheduledBy: ctx.userId,
    });

    return NextResponse.json({
      success: true,
      message: `Downgrade to ${targetSites} site${targetSites !== 1 ? 's' : ''} scheduled for ${new Date(nextBillingDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.`,
      data: {
        targetSites,
        siteIdToDeactivate,
        siteName: site.name,
        effectiveDate: nextBillingDate,
      },
    });
  } catch (err: any) {
    console.error('Error scheduling downgrade:', err);
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

/**
 * DELETE /api/billing/schedule-downgrade
 * Cancel a pending scheduled downgrade.
 */
export async function DELETE(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied.' }, { status: 403 });
  }

  const supabase = getAdminClient();
  const { data: currentSub } = await supabase
    .from('CompanySubscription')
    .select('id, scheduledDowngrade')
    .eq('companyId', ctx.companyId)
    .single();

  if (!currentSub?.scheduledDowngrade) {
    return NextResponse.json({ error: 'No scheduled downgrade found.' }, { status: 404 });
  }

  await supabase
    .from('CompanySubscription')
    .update({
      scheduledDowngrade: false,
      scheduledDowngradeSites: null,
      scheduledDowngradeSiteId: null,
      scheduledDowngradeDate: null,
      scheduledDowngradeBy: null,
      scheduledDowngradeAt: null,
    })
    .eq('id', currentSub.id);

  await auditLog(ctx, 'CANCEL_SCHEDULED_DOWNGRADE', 'CompanySubscription', currentSub.id, {});

  return NextResponse.json({ success: true, message: 'Scheduled downgrade cancelled.' });
}

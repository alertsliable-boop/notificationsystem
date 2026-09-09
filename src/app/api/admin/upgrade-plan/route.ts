import { NextResponse } from 'next/server';
import { requireSuperAdminSession } from '@/lib/adminAuth';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const schema = z.object({
  companyId: z.string().min(1, 'Company ID is required'),
  planCode: z.string().min(1, 'Plan code is required'),
  status: z.enum(['ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED']).optional().default('ACTIVE'),
  extendDays: z.number().int().optional(), // e.g. 30, 365
  customPeriodEnd: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const auth = await requireSuperAdminSession();
  if (!auth.authorized) return auth.response;

  try {
    const body = await req.json();
    const { companyId, planCode, status, extendDays, customPeriodEnd, notes } = schema.parse(body);

    const supabase = getAdminClient();

    // Verify company exists
    const { data: company, error: compErr } = await supabase
      .from('Company')
      .select('id, name')
      .eq('id', companyId)
      .single();

    if (compErr || !company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Verify target plan exists
    const { data: targetPlan, error: planErr } = await supabase
      .from('SubscriptionPlan')
      .select('*')
      .eq('code', planCode)
      .single();

    if (planErr || !targetPlan) {
      return NextResponse.json({ error: `Subscription plan "${planCode}" not found` }, { status: 400 });
    }

    // Determine currentPeriodEnd date
    let newPeriodEnd: string | null = null;
    if (customPeriodEnd) {
      newPeriodEnd = new Date(customPeriodEnd).toISOString();
    } else if (extendDays !== undefined && extendDays > 0) {
      newPeriodEnd = new Date(Date.now() + extendDays * 24 * 60 * 60 * 1000).toISOString();
    } else if (status === 'TRIALING') {
      newPeriodEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days trial
    } else if (status === 'ACTIVE') {
      newPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days standard
    }

    // Check if company subscription already exists
    const { data: existingSub } = await supabase
      .from('CompanySubscription')
      .select('*')
      .eq('companyId', companyId)
      .single();

    let updatedSubscription;

    if (existingSub) {
      const { data, error } = await supabase
        .from('CompanySubscription')
        .update({
          planId: targetPlan.id,
          status,
          currentPeriodEnd: newPeriodEnd,
        })
        .eq('id', existingSub.id)
        .select('*, plan:SubscriptionPlan(*)')
        .single();

      if (error) throw error;
      updatedSubscription = data;
    } else {
      const { data, error } = await supabase
        .from('CompanySubscription')
        .insert({
          companyId,
          planId: targetPlan.id,
          status,
          currentPeriodEnd: newPeriodEnd,
        })
        .select('*, plan:SubscriptionPlan(*)')
        .single();

      if (error) throw error;
      updatedSubscription = data;
    }

    // Record audit log
    try {
      await supabase.from('AuditLog').insert({
        companyId,
        userId: auth.session.user.id || 'superadmin',
        action: 'SUPERADMIN_MANUAL_PLAN_UPDATE',
        entityType: 'CompanySubscription',
        entityId: updatedSubscription.id,
        metadata: {
          adminEmail: auth.session.user.email,
          previousPlan: existingSub?.planId || 'none',
          newPlanCode: targetPlan.code,
          newPlanName: targetPlan.name,
          status,
          currentPeriodEnd: newPeriodEnd,
          notes: notes || 'Manual upgrade/override performed from Admin Portal',
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr) {
      console.warn('[ADMIN AUDIT LOG FAILED]', auditErr);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${company.name} to ${targetPlan.name} (${status}).`,
      data: updatedSubscription,
    });
  } catch (err: any) {
    console.error('[ADMIN UPGRADE PLAN ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to update plan' }, { status: 400 });
  }
}

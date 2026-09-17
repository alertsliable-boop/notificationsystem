import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { z } from 'zod';

const siteSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  address: z.string().max(255).optional().nullable(),
  customerId: z.string().min(1, 'Customer is required'),
});

export async function PUT(req: Request, { params }: { params: Promise<{ id: string  }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: id } = await params;

  try {
    const body = await req.json();
    const { name, address, customerId } = siteSchema.parse(body);

    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from('Site')
      .select('*')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    // Verify customer belongs to the company
    const { data: customer } = await supabase
      .from('Customer')
      .select('*')
      .eq('id', customerId)
      .eq('companyId', ctx.companyId)
      .single();

    if (!customer) {
      return NextResponse.json({ error: 'Invalid customer' }, { status: 400 });
    }

    const { data: site } = await supabase
      .from('Site')
      .update({ name, address, customerId })
      .eq('id', id)
      .select()
      .single();
      
    if (!site) throw new Error('Failed to update site');

    await auditLog(ctx, 'UPDATE_SITE', 'Site', site.id, { name });

    return NextResponse.json({ data: site }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Validation error' }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string  }> }) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const { id: id } = await params;

  try {
    const supabase = getAdminClient();
    const { data: existing } = await supabase
      .from('Site')
      .select('*')
      .eq('id', id)
      .eq('companyId', ctx.companyId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const { error } = await supabase
      .from('Site')
      .delete()
      .eq('id', id);
      
    if (error) throw error;

    // Update activeSites count
    const { count: remainingSites } = await supabase
      .from('Site')
      .select('*', { count: 'exact', head: true })
      .eq('companyId', ctx.companyId);

    const updatedSiteCount = Math.max(1, remainingSites || 1);
    await supabase
      .from('CompanySubscription')
      .update({ activeSites: updatedSiteCount })
      .eq('companyId', ctx.companyId);

    // Sync with Stripe if active subscription exists
    const { stripe, isStripeConfigured } = await import('@/lib/stripe');
    const { data: sub } = await supabase
      .from('CompanySubscription')
      .select('*')
      .eq('companyId', ctx.companyId)
      .single();

    if (sub?.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith('mock_') && isStripeConfigured()) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
        const sitePriceId = process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
        const siteItem = stripeSub.items.data.find((it: any) => it.price.id === sitePriceId);
        if (siteItem) {
          await stripe.subscriptionItems.update(siteItem.id, {
            quantity: updatedSiteCount,
            proration_behavior: 'always_invoice',
          });
        }
      } catch (stripeErr: any) {
        console.warn('Could not sync Stripe quantity on site deletion:', stripeErr.message);
      }
    }

    await auditLog(ctx, 'DELETE_SITE', 'Site', id, { name: existing.name, remainingSites: updatedSiteCount });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to delete site. Ensure no endpoints are linked.' }, { status: 400 });
  }
}

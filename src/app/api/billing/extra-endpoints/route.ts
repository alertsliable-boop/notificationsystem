import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';
import { nanoid } from 'nanoid';

// POST /api/billing/extra-endpoints — Purchase or adjust single endpoints ($12/mo each)
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage endpoints quota.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { count, action } = body; // action: 'set' | 'add'

    const supabase = getAdminClient();

    const { data: sub } = await supabase
      .from('CompanySubscription')
      .select('*, plan:SubscriptionPlan(*)')
      .eq('companyId', ctx.companyId)
      .single();

    if (!sub) {
      return NextResponse.json({ error: 'Subscription not found' }, { status: 404 });
    }

    const currentExtra = sub.extraEndpoints || 0;
    let newExtra = currentExtra;

    if (action === 'add') {
      const delta = parseInt(count, 10) || 1;
      newExtra = Math.max(0, currentExtra + delta);
    } else {
      newExtra = Math.max(0, parseInt(count, 10) || 0);
    }

    const addedQty = newExtra - currentExtra;

    // Additional endpoint price in Stripe ($12/month = 1200 cents)
    const STRIPE_EXTRA_ENDPOINT_PRICE_ID = process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UDETs33lejKAXgD3TMm7qgK';

    // Update Stripe subscription item if active subscription exists
    if (sub.stripeSubscriptionId && !sub.stripeSubscriptionId.startsWith('mock_') && isStripeConfigured()) {
      try {
        const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);

        // Find existing extra endpoint subscription item
        const existingItem = stripeSub.items.data.find(
          (item) => item.price.id === STRIPE_EXTRA_ENDPOINT_PRICE_ID
        );

        if (newExtra > 0) {
          if (existingItem) {
            await stripe.subscriptionItems.update(existingItem.id, {
              quantity: newExtra,
              proration_behavior: 'always_invoice',
            });
          } else {
            await stripe.subscriptionItems.create({
              subscription: stripeSub.id,
              price: STRIPE_EXTRA_ENDPOINT_PRICE_ID,
              quantity: newExtra,
              proration_behavior: 'always_invoice',
            });
          }
        } else if (existingItem) {
          // Extra count set to 0, delete item
          await stripe.subscriptionItems.del(existingItem.id, {
            proration_behavior: 'none',
          });
        }
      } catch (stripeErr: any) {
        console.warn('Could not update Stripe subscription for extra endpoints:', stripeErr.message);
      }
    }

    // Update CompanySubscription in database
    await supabase
      .from('CompanySubscription')
      .update({ extraEndpoints: newExtra })
      .eq('id', sub.id);

    // Record invoice in BillingInvoice if quantity increased
    if (addedQty > 0) {
      await supabase
        .from('BillingInvoice')
        .insert({
          id: nanoid(),
          companyId: ctx.companyId,
          invoiceNumber: `INV-EP-${nanoid(6).toUpperCase()}`,
          amountCents: addedQty * 1200,
          currency: 'usd',
          status: 'paid',
          description: `${addedQty} Additional Email Endpoint${addedQty > 1 ? 's' : ''} ($12.00/mo each)`,
          cardBrand: sub.cardBrand || 'Card',
          cardLast4: sub.cardLast4 || '••••',
          createdAt: new Date().toISOString(),
        });
    }

    const baseMax = sub.plan?.maxActiveEndpoints || 1;
    const totalMax = baseMax + newExtra;

    await auditLog(ctx, 'PURCHASE_EXTRA_ENDPOINTS', 'CompanySubscription', sub.id, {
      previousExtra: currentExtra,
      newExtra,
      totalMaxEndpoints: totalMax,
    });

    return NextResponse.json({
      success: true,
      extraEndpoints: newExtra,
      baseEndpoints: baseMax,
      totalMaxEndpoints: totalMax,
      message: addedQty > 0
        ? `Successfully purchased ${addedQty} additional email endpoint${addedQty > 1 ? 's' : ''} for $${(addedQty * 12).toFixed(2)}/mo!`
        : 'Additional endpoints updated successfully.',
    });
  } catch (err: any) {
    console.error('Error updating extra endpoints:', err);
    return NextResponse.json({ error: err.message || 'Failed to update extra endpoints' }, { status: 500 });
  }
}

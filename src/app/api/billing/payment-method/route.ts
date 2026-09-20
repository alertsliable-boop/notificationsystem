import { NextResponse } from 'next/server';
import { requireAuth, isUnauthorizedResponse, auditLog } from '@/lib/rbac';
import { getAdminClient } from '@/lib/supabase';
import { stripe, isStripeConfigured } from '@/lib/stripe';

// GET /api/billing/payment-method — Return current card information
export async function GET() {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  const supabase = getAdminClient();

  const { data: sub } = await supabase
    .from('CompanySubscription')
    .select('*')
    .eq('companyId', ctx.companyId)
    .single();

  if (!sub) {
    return NextResponse.json({ hasPaymentMethod: false, card: null });
  }

  let cardData = null;

  // 1. Try fetching live from Stripe if customer ID exists
  if (sub.stripeCustomerId && isStripeConfigured()) {
    try {
      const customer = await stripe.customers.retrieve(sub.stripeCustomerId, {
        expand: ['invoice_settings.default_payment_method', 'default_source'],
      }) as any;

      const defaultPm = customer?.invoice_settings?.default_payment_method;
      if (defaultPm?.card) {
        cardData = {
          brand: defaultPm.card.brand ? (defaultPm.card.brand.charAt(0).toUpperCase() + defaultPm.card.brand.slice(1)) : 'Card',
          last4: defaultPm.card.last4,
          expMonth: defaultPm.card.exp_month,
          expYear: defaultPm.card.exp_year,
          funding: defaultPm.card.funding,
          cardholderName: defaultPm.billing_details?.name || customer.name || '',
          billingEmail: defaultPm.billing_details?.email || customer.email || '',
        };
      }
    } catch (err) {
      console.warn('Could not fetch card from Stripe, falling back to DB:', err);
    }
  }

  // 2. Fall back to local database stored card metadata
  if (!cardData && sub.cardLast4) {
    cardData = {
      brand: sub.cardBrand || 'Card',
      last4: sub.cardLast4,
      expMonth: sub.cardExpMonth,
      expYear: sub.cardExpYear,
      cardholderName: '',
      billingEmail: sub.billingEmail || '',
    };
  }

  return NextResponse.json({
    hasPaymentMethod: !!cardData,
    card: cardData,
    extraEndpoints: sub.extraEndpoints || 0,
  });
}

// POST /api/billing/payment-method — Securely attach tokenized payment method (PCI DSS Compliant)
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage billing.' }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Reject any raw card data submissions immediately
    if (body.cardNumber || body.cvc) {
      return NextResponse.json({
        error: 'Direct raw card processing is disabled for PCI DSS security. Please use Stripe Elements.',
      }, { status: 400 });
    }

    let { paymentMethodId, setupIntentId } = body;

    const supabase = getAdminClient();

    // Fetch company & subscription
    const [{ data: company }, { data: sub }, { data: user }] = await Promise.all([
      supabase.from('Company').select('*').eq('id', ctx.companyId).single(),
      supabase.from('CompanySubscription').select('*').eq('companyId', ctx.companyId).single(),
      supabase.from('User').select('email, name').eq('id', ctx.userId).single(),
    ]);

    let stripeCustomerId = sub?.stripeCustomerId;

    if (isStripeConfigured()) {
      // Ensure customer exists in Stripe
      if (!stripeCustomerId) {
        const newCust = await stripe.customers.create({
          name: company?.name || user?.name || 'Workspace Customer',
          email: sub?.billingEmail || user?.email || undefined,
          metadata: { companyId: ctx.companyId },
        });
        stripeCustomerId = newCust.id;
      }

      // If setupIntentId was provided instead of paymentMethodId, extract paymentMethod from SetupIntent
      if (!paymentMethodId && setupIntentId) {
        const si = await stripe.setupIntents.retrieve(setupIntentId);
        paymentMethodId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id;
      }

      if (!paymentMethodId) {
        return NextResponse.json({ error: 'Missing payment method identifier' }, { status: 400 });
      }

      // Retrieve the payment method directly from Stripe
      const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

      if (paymentMethod.type !== 'card' || !paymentMethod.card) {
        return NextResponse.json({ error: 'Selected payment method is not a valid card' }, { status: 400 });
      }

      // Attach payment method to Stripe customer if not already attached
      if (paymentMethod.customer !== stripeCustomerId) {
        await stripe.paymentMethods.attach(paymentMethod.id, {
          customer: stripeCustomerId,
        });
      }

      // Set as default payment method on customer invoice settings
      await stripe.customers.update(stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.id,
        },
      });

      const brand = paymentMethod.card.brand
        ? paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1)
        : 'Card';
      const last4 = paymentMethod.card.last4;
      const expMonth = paymentMethod.card.exp_month;
      const expYear = paymentMethod.card.exp_year;
      const cardholderName = paymentMethod.billing_details?.name || '';
      const billingEmail = paymentMethod.billing_details?.email || sub?.billingEmail || user?.email || '';

      // Update CompanySubscription in database with safe non-sensitive metadata only
      if (sub) {
        await supabase
          .from('CompanySubscription')
          .update({
            stripeCustomerId,
            cardBrand: brand,
            cardLast4: last4,
            cardExpMonth: expMonth,
            cardExpYear: expYear,
            billingEmail,
          })
          .eq('id', sub.id);
      } else {
        await supabase
          .from('CompanySubscription')
          .insert({
            companyId: ctx.companyId,
            planId: 'plan_starter_1',
            status: 'ACTIVE',
            stripeCustomerId,
            cardBrand: brand,
            cardLast4: last4,
            cardExpMonth: expMonth,
            cardExpYear: expYear,
            billingEmail,
          });
      }

      await auditLog(ctx, 'UPDATE_PAYMENT_METHOD', 'CompanySubscription', ctx.companyId, {
        brand,
        last4,
      });

      return NextResponse.json({
        success: true,
        card: {
          brand,
          last4,
          expMonth,
          expYear,
          cardholderName,
          billingEmail,
        },
      });
    }

    // Fallback if Stripe is not configured
    return NextResponse.json({
      error: 'Stripe is not configured on this environment.',
    }, { status: 400 });

  } catch (err: any) {
    console.error('Error saving payment method:', err);
    return NextResponse.json({ error: err.message || 'Failed to save payment method' }, { status: 500 });
  }
}

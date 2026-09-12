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
          brand: defaultPm.card.brand,
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

// POST /api/billing/payment-method — Update payment method in-app
export async function POST(req: Request) {
  const ctx = await requireAuth();
  if (isUnauthorizedResponse(ctx)) return ctx;

  if (ctx.role !== 'OWNER' && ctx.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Permission denied. Only Admins can manage billing.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { cardNumber, expMonth, expYear, cvc, cardholderName, billingEmail, postalCode } = body;

    const cleanNumber = (cardNumber || '').replace(/\D/g, '');
    const cleanMonth = parseInt(expMonth, 10);
    const cleanYear = parseInt(expYear, 10);
    const cleanCvc = (cvc || '').trim();

    if (!cleanNumber || cleanNumber.length < 13 || cleanNumber.length > 19) {
      return NextResponse.json({ error: 'Invalid card number' }, { status: 400 });
    }

    if (!cleanMonth || cleanMonth < 1 || cleanMonth > 12) {
      return NextResponse.json({ error: 'Invalid expiration month' }, { status: 400 });
    }

    const fullYear = cleanYear < 100 ? 2000 + cleanYear : cleanYear;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (fullYear < currentYear || (fullYear === currentYear && cleanMonth < currentMonth)) {
      return NextResponse.json({ error: 'Card expiration date has already passed' }, { status: 400 });
    }

    if (!cleanCvc || cleanCvc.length < 3) {
      return NextResponse.json({ error: 'Invalid CVC / security code' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // Fetch company & subscription
    const [{ data: company }, { data: sub }] = await Promise.all([
      supabase.from('Company').select('*').eq('id', ctx.companyId).single(),
      supabase.from('CompanySubscription').select('*').eq('companyId', ctx.companyId).single(),
    ]);

    let detectedBrand = 'Visa';
    if (cleanNumber.startsWith('4')) detectedBrand = 'Visa';
    else if (/^5[1-5]/.test(cleanNumber)) detectedBrand = 'Mastercard';
    else if (/^3[47]/.test(cleanNumber)) detectedBrand = 'Amex';
    else if (/^6(?:011|5)/.test(cleanNumber)) detectedBrand = 'Discover';

    const last4 = cleanNumber.slice(-4);
    let stripeCustomerId = sub?.stripeCustomerId;

    // Process with Stripe if configured
    if (isStripeConfigured()) {
      try {
        // Ensure Stripe customer exists
        if (!stripeCustomerId) {
          const newCust = await stripe.customers.create({
            name: cardholderName || company?.name || 'Customer',
            email: billingEmail || undefined,
            metadata: { companyId: ctx.companyId },
          });
          stripeCustomerId = newCust.id;
        }

        // Create PaymentMethod in Stripe
        const paymentMethod = await stripe.paymentMethods.create({
          type: 'card',
          card: {
            number: cleanNumber,
            exp_month: cleanMonth,
            exp_year: fullYear,
            cvc: cleanCvc,
          },
          billing_details: {
            name: cardholderName || company?.name,
            email: billingEmail || undefined,
            address: postalCode ? { postal_code: postalCode } : undefined,
          },
        });

        // Attach to customer
        await stripe.paymentMethods.attach(paymentMethod.id, {
          customer: stripeCustomerId,
        });

        // Set as default payment method
        await stripe.customers.update(stripeCustomerId, {
          invoice_settings: {
            default_payment_method: paymentMethod.id,
          },
        });

        if (paymentMethod.card?.brand) {
          detectedBrand = paymentMethod.card.brand.charAt(0).toUpperCase() + paymentMethod.card.brand.slice(1);
        }
      } catch (stripeErr: any) {
        console.error('[Stripe PaymentMethod Error]', stripeErr);
        return NextResponse.json({ error: stripeErr.message || 'Payment method was declined by the card issuer' }, { status: 400 });
      }
    }

    // Update CompanySubscription in database
    if (sub) {
      await supabase
        .from('CompanySubscription')
        .update({
          stripeCustomerId: stripeCustomerId || sub.stripeCustomerId,
          cardBrand: detectedBrand,
          cardLast4: last4,
          cardExpMonth: cleanMonth,
          cardExpYear: fullYear,
          billingEmail: billingEmail || sub.billingEmail,
        })
        .eq('id', sub.id);
    } else {
      await supabase
        .from('CompanySubscription')
        .insert({
          companyId: ctx.companyId,
          planId: 'plan_starter_1',
          status: 'ACTIVE',
          stripeCustomerId: stripeCustomerId || null,
          cardBrand: detectedBrand,
          cardLast4: last4,
          cardExpMonth: cleanMonth,
          cardExpYear: fullYear,
          billingEmail: billingEmail || null,
        });
    }

    await auditLog(ctx, 'UPDATE_PAYMENT_METHOD', 'CompanySubscription', ctx.companyId, {
      brand: detectedBrand,
      last4,
    });

    return NextResponse.json({
      success: true,
      card: {
        brand: detectedBrand,
        last4,
        expMonth: cleanMonth,
        expYear: fullYear,
        cardholderName,
        billingEmail,
      },
    });
  } catch (err: any) {
    console.error('Error updating payment method:', err);
    return NextResponse.json({ error: err.message || 'Failed to update payment method' }, { status: 500 });
  }
}

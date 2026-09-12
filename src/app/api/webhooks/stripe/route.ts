import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } else {
      event = JSON.parse(body);
    }
  } catch (err: any) {
    console.error(`[STRIPE WEBHOOK ERROR] ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  const supabase = getAdminClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any;
      const companyId = session.metadata?.companyId || session.client_reference_id;
      const planCode = session.metadata?.planCode;
      const extraEndpoints = parseInt(session.metadata?.extraEndpoints || '0', 10) || 0;
      const stripeCustomerId = session.customer;

      if (companyId && planCode) {
        const { data: plan } = await supabase
          .from('SubscriptionPlan')
          .select('*')
          .eq('code', planCode)
          .single();

        if (plan) {
          const subscriptionId = session.subscription || session.id;
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          // Fetch default card details from Stripe customer if available
          let cardDetails: any = {};
          if (stripeCustomerId) {
            try {
              const pms = await stripe.paymentMethods.list({
                customer: stripeCustomerId,
                type: 'card',
                limit: 1,
              });
              if (pms.data.length > 0) {
                const c = pms.data[0].card;
                cardDetails = {
                  cardBrand: c?.brand ? c.brand.charAt(0).toUpperCase() + c.brand.slice(1) : null,
                  cardLast4: c?.last4 || null,
                  cardExpMonth: c?.exp_month || null,
                  cardExpYear: c?.exp_year || null,
                  billingEmail: pms.data[0].billing_details?.email || session.customer_details?.email || null,
                };
              }
            } catch (pmErr: any) {
              console.warn('[STRIPE WEBHOOK] Failed to list payment methods for card sync:', pmErr.message);
            }
          }
          
          const { data: existingSub } = await supabase
            .from('CompanySubscription')
            .select('id')
            .eq('companyId', companyId)
            .single();

          const subPayload = {
            planId: plan.id,
            status: 'ACTIVE',
            stripeSubscriptionId: subscriptionId,
            stripeCustomerId: stripeCustomerId || undefined,
            extraEndpoints,
            currentPeriodEnd,
            ...cardDetails,
          };

          if (existingSub) {
            await supabase
              .from('CompanySubscription')
              .update(subPayload)
              .eq('id', existingSub.id);
          } else {
            await supabase
              .from('CompanySubscription')
              .insert({
                companyId,
                ...subPayload,
              });
          }

          // Record in-app billing invoice
          const totalAmount = session.amount_total || (plan.priceCents + extraEndpoints * 1200);
          await supabase
            .from('BillingInvoice')
            .insert({
              id: nanoid(),
              companyId,
              stripeInvoiceId: session.invoice || null,
              invoiceNumber: `INV-${nanoid(6).toUpperCase()}`,
              amountCents: totalAmount,
              currency: session.currency || 'usd',
              status: 'paid',
              description: `Subscription to ${plan.name} Plan${extraEndpoints > 0 ? ` + ${extraEndpoints} Extra Endpoint(s)` : ''}`,
              cardBrand: cardDetails.cardBrand || 'Card',
              cardLast4: cardDetails.cardLast4 || '••••',
              pdfUrl: null,
              createdAt: new Date().toISOString(),
            });

          console.log(`[STRIPE WEBHOOK] Activated plan ${planCode} for company ${companyId}`);
        }
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as any;
      const stripeSubId = subscription.id;
      const status = subscription.status === 'active' ? 'ACTIVE' :
                     subscription.status === 'past_due' ? 'PAST_DUE' :
                     subscription.status === 'canceled' ? 'CANCELED' : 'ACTIVE';
                     
      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const priceId = subscription.items?.data?.[0]?.price?.id;
      
      let updateData: any = { status, currentPeriodEnd };

      if (priceId) {
        const { data: plan } = await supabase
          .from('SubscriptionPlan')
          .select('id')
          .eq('stripePriceId', priceId)
          .single();
          
        if (plan) {
          updateData.planId = plan.id;
        }
      }

      await supabase
        .from('CompanySubscription')
        .update(updateData)
        .eq('stripeSubscriptionId', stripeSubId);

      console.log(`[STRIPE WEBHOOK] Subscription ${stripeSubId} updated. Status: ${status}`);
      break;
    }

    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

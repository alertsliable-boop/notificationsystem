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
      const activeSites = parseInt(session.metadata?.activeSites || '1', 10) || 1;
      const extraEndpoints = parseInt(session.metadata?.extraEndpoints || '0', 10) || 0;
      const stripeCustomerId = session.customer;

      if (companyId) {
        // Map planCode based on activeSites if needed
        let targetCode = planCode || 'site_starter';
        if (!planCode || planCode.startsWith('site_')) {
          if (activeSites >= 50) targetCode = 'site_enterprise';
          else if (activeSites >= 25) targetCode = 'site_pro_plus';
          else if (activeSites >= 10) targetCode = 'site_pro';
          else targetCode = 'site_starter';
        }

        const { data: plan } = await supabase
          .from('SubscriptionPlan')
          .select('*')
          .eq('code', targetCode)
          .single();

        if (plan) {
          const subscriptionId = session.subscription || session.id;
          const currentPeriodStart = new Date().toISOString();
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
            activeSites,
            extraEndpoints,
            currentPeriodStart,
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
          const totalAmount = session.amount_total || (plan.priceCents * activeSites + extraEndpoints * 1500);
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
              description: `Subscription: ${activeSites} Active Site(s) (${plan.name})${extraEndpoints > 0 ? ` + ${extraEndpoints} Additional Endpoint(s)` : ''}`,
              cardBrand: cardDetails.cardBrand || 'Card',
              cardLast4: cardDetails.cardLast4 || '••••',
              pdfUrl: null,
              createdAt: new Date().toISOString(),
            });

          console.log(`[STRIPE WEBHOOK] Activated site subscription for company ${companyId}: ${activeSites} sites, ${extraEndpoints} extra endpoints`);
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
                     
      const currentPeriodStart = subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : new Date().toISOString();
      const currentPeriodEnd = subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // Look for site item and extra endpoints item in subscription items
      const sitePriceId = process.env.NEXT_PUBLIC_STRIPE_SITE_PRICE_ID || 'price_1UGi0d33lejKAXgDiGPnXQXW';
      const extraPriceId = process.env.STRIPE_EXTRA_ENDPOINT_PRICE_ID || 'price_1UGi0d33lejKAXgDsWnNcIH4';

      let sitesQty: number | null = null;
      let extraQty: number | null = null;

      for (const item of (subscription.items?.data || [])) {
        if (item.price?.id === sitePriceId || item.price?.recurring?.tiers_mode === 'volume') {
          sitesQty = item.quantity;
        } else if (item.price?.id === extraPriceId) {
          extraQty = item.quantity;
        }
      }

      let updateData: any = { status, currentPeriodStart, currentPeriodEnd };
      if (sitesQty !== null && sitesQty > 0) {
        updateData.activeSites = sitesQty;
        // Determine matching plan code based on sites quantity
        let planCode = 'site_starter';
        if (sitesQty >= 50) planCode = 'site_enterprise';
        else if (sitesQty >= 25) planCode = 'site_pro_plus';
        else if (sitesQty >= 10) planCode = 'site_pro';

        const { data: matchedPlan } = await supabase
          .from('SubscriptionPlan')
          .select('id')
          .eq('code', planCode)
          .single();

        if (matchedPlan) {
          updateData.planId = matchedPlan.id;
        }
      }

      if (extraQty !== null) {
        updateData.extraEndpoints = extraQty;
      }

      await supabase
        .from('CompanySubscription')
        .update(updateData)
        .eq('stripeSubscriptionId', stripeSubId);

      console.log(`[STRIPE WEBHOOK] Subscription ${stripeSubId} updated. Status: ${status}, Sites: ${sitesQty ?? 'unchanged'}`);
      break;
    }

    case 'invoice.paid': {
      const invoice = event.data.object as any;
      const stripeSubId = invoice.subscription;
      if (stripeSubId && invoice.amount_paid > 0) {
        const { data: sub } = await supabase
          .from('CompanySubscription')
          .select('companyId, cardBrand, cardLast4')
          .eq('stripeSubscriptionId', stripeSubId)
          .single();

        if (sub?.companyId) {
          // Verify if invoice already recorded
          const { data: existingInv } = await supabase
            .from('BillingInvoice')
            .select('id')
            .eq('stripeInvoiceId', invoice.id)
            .single();

          if (!existingInv) {
            await supabase
              .from('BillingInvoice')
              .insert({
                id: nanoid(),
                companyId: sub.companyId,
                stripeInvoiceId: invoice.id,
                invoiceNumber: invoice.number || `INV-${nanoid(6).toUpperCase()}`,
                amountCents: invoice.amount_paid,
                currency: invoice.currency || 'usd',
                status: 'paid',
                description: invoice.description || 'Monthly Subscription Renewal',
                cardBrand: sub.cardBrand || 'Card',
                cardLast4: sub.cardLast4 || '••••',
                pdfUrl: invoice.invoice_pdf || null,
                createdAt: new Date().toISOString(),
              });
            console.log(`[STRIPE WEBHOOK] Recorded recurring invoice for company ${sub.companyId}`);
          }
        }
      }
      break;
    }

    default:
      console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

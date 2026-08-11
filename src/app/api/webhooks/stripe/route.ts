import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getAdminClient } from '@/lib/supabase';

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

      if (companyId && planCode) {
        const { data: plan } = await supabase
          .from('SubscriptionPlan')
          .select('*')
          .eq('code', planCode)
          .single();

        if (plan) {
          const subscriptionId = session.subscription || session.id;
          
          await supabase
            .from('CompanySubscription')
            .upsert({
              companyId,
              planId: plan.id,
              status: 'ACTIVE',
              stripeSubscriptionId: subscriptionId,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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

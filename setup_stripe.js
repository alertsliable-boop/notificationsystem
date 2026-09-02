const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function setup() {
  console.log("Setting up Stripe Products and Prices...");
  
  const plans = [
    { code: 'starter', name: 'Starter Plan', price: 1900 },
    { code: 'pro', name: 'Professional Plan', price: 5900 },
    { code: 'business', name: 'Business Plan', price: 12900 },
  ];

  for (const plan of plans) {
    console.log(`Creating product for ${plan.name}...`);
    const product = await stripe.products.create({
      name: `Liable Alerts - ${plan.name}`,
      description: `Liable Alerts ${plan.name} Subscription`,
    });

    console.log(`Creating price for ${plan.name}...`);
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.price,
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log(`Updating database for ${plan.code} with Price ID: ${price.id}`);
    await supabase
      .from('SubscriptionPlan')
      .update({ stripePriceId: price.id })
      .eq('code', plan.code);
  }

  console.log("Creating Additional Endpoint Product...");
  const addOnProduct = await stripe.products.create({
    name: 'Liable Alerts - Additional Endpoint',
    description: 'One additional active email endpoint',
  });
  const addOnPrice = await stripe.prices.create({
    product: addOnProduct.id,
    unit_amount: 1200,
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`Additional Endpoint Price ID: ${addOnPrice.id}`);

  console.log("Creating SMS Overage Product...");
  const overageProduct = await stripe.products.create({
    name: 'Liable Alerts - SMS Overage',
    description: 'Additional outbound SMS segments over the monthly allowance',
  });
  const overagePrice = await stripe.prices.create({
    product: overageProduct.id,
    unit_amount: 5, // $0.05
    currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered' },
  });
  console.log(`Overage Price ID: ${overagePrice.id}`);

  console.log("Setup Complete! Check your Stripe Dashboard.");
}

setup().catch(console.error);

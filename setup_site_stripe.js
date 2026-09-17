const Stripe = require('stripe');
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setup() {
  console.log('--- Setting up Stripe Products and Prices for Site-Based Pricing ---');

  // 1. Site Subscription Product & Tiered Volume Price
  console.log('Creating/verifying Site Subscription product...');
  const siteProduct = await stripe.products.create({
    name: 'Liable Alerts - Active Site Subscription',
    description: 'Volume-tiered subscription per active site. 1-9: $49/site, 10-24: $44/site, 25-49: $39/site, 50+: $34/site.',
  });

  console.log('Creating volume-tiered price for Site Subscription...');
  const siteTieredPrice = await stripe.prices.create({
    product: siteProduct.id,
    currency: 'usd',
    recurring: { interval: 'month' },
    billing_scheme: 'tiered',
    tiers_mode: 'volume',
    tiers: [
      { up_to: 9, unit_amount: 4900 },
      { up_to: 24, unit_amount: 4400 },
      { up_to: 49, unit_amount: 3900 },
      { up_to: 'inf', unit_amount: 3400 },
    ],
  });
  console.log(`✓ Site Tiered Price ID: ${siteTieredPrice.id}`);

  // 2. Additional Endpoint Product & Price ($15/mo)
  console.log('Creating/verifying Additional Endpoint product ($15/mo)...');
  const addOnProduct = await stripe.products.create({
    name: 'Liable Alerts - Additional Endpoint',
    description: 'One additional dedicated alarm email endpoint at the same physical site ($15/mo, includes 250 SMS credits).',
  });
  const addOnPrice = await stripe.prices.create({
    product: addOnProduct.id,
    unit_amount: 1500, // $15.00
    currency: 'usd',
    recurring: { interval: 'month' },
  });
  console.log(`✓ Additional Endpoint Price ID: ${addOnPrice.id}`);

  // 3. SMS Overage Block Product & Price ($10 per 250 credits)
  console.log('Creating SMS Overage Block product ($10 per 250 credits)...');
  const overageProduct = await stripe.products.create({
    name: 'Liable Alerts - SMS Overage Block',
    description: 'Additional 250 SMS delivery credits for high-volume alarm delivery ($10/block).',
  });
  const overagePrice = await stripe.prices.create({
    product: overageProduct.id,
    unit_amount: 1000, // $10.00
    currency: 'usd',
  });
  console.log(`✓ SMS Overage Price ID: ${overagePrice.id}`);

  // 4. Update Database SubscriptionPlan table with the site tiered price
  console.log('Updating database plans with the new Stripe Price IDs...');
  const planCodes = ['site_starter', 'site_pro', 'site_pro_plus', 'site_enterprise'];
  for (const code of planCodes) {
    await pool.query(
      'UPDATE "SubscriptionPlan" SET "stripePriceId" = $1 WHERE "code" = $2',
      [siteTieredPrice.id, code]
    );
  }
  console.log('✓ Linked Stripe Price ID to site plans in database.');

  await pool.end();

  console.log('\n=== SETUP COMPLETE ===');
  console.log(`NEXT_PUBLIC_STRIPE_SITE_PRICE_ID=${siteTieredPrice.id}`);
  console.log(`STRIPE_EXTRA_ENDPOINT_PRICE_ID=${addOnPrice.id}`);
  console.log(`STRIPE_SMS_OVERAGE_PRICE_ID=${overagePrice.id}`);
}

setup().catch(console.error);

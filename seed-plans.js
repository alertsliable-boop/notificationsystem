require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const plans = [
    {
      id: require('crypto').randomUUID(),
      name: 'Free Trial',
      code: 'free_trial',
      priceCents: 0,
      maxActiveEndpoints: 1,
      stripePriceId: null
    },
    {
      id: require('crypto').randomUUID(),
      name: 'Starter',
      code: 'starter',
      priceCents: 4900,
      maxActiveEndpoints: 1,
      stripePriceId: 'price_1PuxIqF33lejKAXgzU1wWwI2' // replace with real if needed
    },
    {
      id: require('crypto').randomUUID(),
      name: 'Professional',
      code: 'pro',
      priceCents: 14900,
      maxActiveEndpoints: 5,
      stripePriceId: 'price_1PuxK8F33lejKAXgoO2EwF0W' // replace with real if needed
    },
    {
      id: require('crypto').randomUUID(),
      name: 'Business',
      code: 'business',
      priceCents: 39900,
      maxActiveEndpoints: 15,
      stripePriceId: 'price_1PuxKZF33lejKAXgc361X7tK' // replace with real if needed
    }
  ];

  try {
    for (const p of plans) {
      await pool.query(
        `INSERT INTO "SubscriptionPlan" (id, name, code, "priceCents", "maxActiveEndpoints", "stripePriceId") 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (code) DO UPDATE SET 
           name = EXCLUDED.name, 
           "priceCents" = EXCLUDED."priceCents", 
           "maxActiveEndpoints" = EXCLUDED."maxActiveEndpoints"`,
        [p.id, p.name, p.code, p.priceCents, p.maxActiveEndpoints, p.stripePriceId]
      );
      console.log(`Inserted/Updated ${p.name}`);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

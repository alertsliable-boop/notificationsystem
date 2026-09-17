const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Running database migration for Site-based pricing and SMS credit tracking...');

  try {
    // 1. InboundEndpoint columns
    await pool.query(`
      ALTER TABLE "InboundEndpoint" 
      ADD COLUMN IF NOT EXISTS "smsUsageOption" TEXT NOT NULL DEFAULT 'AUTO_OVERAGE',
      ADD COLUMN IF NOT EXISTS "monthlyOverageLimitCents" INTEGER,
      ADD COLUMN IF NOT EXISTS "isAdditional" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "notifiedAt80" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "notifiedAt90" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "notifiedAt100" BOOLEAN NOT NULL DEFAULT false;
    `);
    console.log('✓ Updated InboundEndpoint table');

    // 2. CompanySubscription columns
    await pool.query(`
      ALTER TABLE "CompanySubscription"
      ADD COLUMN IF NOT EXISTS "activeSites" INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    console.log('✓ Updated CompanySubscription table');

    // 3. SmsMessage columns
    await pool.query(`
      ALTER TABLE "SmsMessage"
      ADD COLUMN IF NOT EXISTS "segments" INTEGER NOT NULL DEFAULT 1;
    `);
    console.log('✓ Updated SmsMessage table');

    // 4. Update/Upsert SubscriptionPlan records
    await pool.query(`
      INSERT INTO "SubscriptionPlan" ("id", "code", "name", "maxActiveEndpoints", "priceCents")
      VALUES
        ('plan_free_trial', 'free_trial', 'Free Trial (7 Days)', 1, 0),
        ('plan_site_starter', 'site_starter', 'Starter (1–9 sites)', 1, 4900),
        ('plan_site_pro', 'site_pro', 'Professional (10–24 sites)', 1, 4400),
        ('plan_site_pro_plus', 'site_pro_plus', 'Professional Plus (25–49 sites)', 1, 3900),
        ('plan_site_enterprise', 'site_enterprise', 'Enterprise (50+ sites)', 1, 3400)
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "maxActiveEndpoints" = EXCLUDED."maxActiveEndpoints",
        "priceCents" = EXCLUDED."priceCents";
    `);
    console.log('✓ Upserted Site Subscription Plans');

    const check = await pool.query('SELECT code, name, "priceCents" FROM "SubscriptionPlan"');
    console.log('Current plans in DB:', check.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await pool.end();
  }
}

migrate().catch(console.error);

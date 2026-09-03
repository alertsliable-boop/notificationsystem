const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const pool = new Pool({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  const res = await pool.query('SELECT * FROM "SubscriptionPlan"');
  console.log(res.rows);
  await pool.end();
}
main().catch(console.error);

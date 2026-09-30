require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const res = await pool.query(`UPDATE "PhoneRecipient" SET "consentStatus" = 'ACTIVE' WHERE "consentStatus" = 'PENDING' RETURNING *`);
    console.log(`Updated ${res.rowCount} recipients from PENDING to ACTIVE.`);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

run();

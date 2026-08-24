const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    const notifRes = await pool.query('SELECT * FROM "Notification" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('--- RECENT NOTIFICATIONS ---');
    console.log(notifRes.rows);

    const smsRes = await pool.query('SELECT * FROM "SmsMessage" ORDER BY "createdAt" DESC LIMIT 5');
    console.log('\n--- RECENT SMS MESSAGES ---');
    console.log(smsRes.rows);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}
run();

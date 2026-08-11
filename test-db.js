require('dotenv').config();
const { Pool } = require('pg');

async function test() {
  console.log('Testing connection to:', process.env.DATABASE_URL.replace(/:[^:]+@/, ':***@'));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('Connection successful:', res.rows[0]);
  } catch (e) {
    console.error('Connection error:', e);
  } finally {
    await pool.end();
  }
}
test();

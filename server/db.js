import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Global TLS bypass removed to secure external APIs (Stripe, Gemini, Google). pg pool SSL config below handles database connection ssl validation bypass.
// process.env.NODE_TLS_REJECT_UNAUTHORIZED = '1';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// Parse database URL and remove any sslmode query parameters that override our SSL configuration
let connectionString = process.env.DATABASE_URL;
try {
  const dbUrl = new URL(connectionString);
  dbUrl.searchParams.delete('sslmode');
  connectionString = dbUrl.toString();
} catch (urlErr) {
  console.warn('Failed to parse DATABASE_URL with URL parser:', urlErr.message);
}

// DO PG usually requires SSL. We configure it dynamically.
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('PostgreSQL connection established successfully.');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client:', err);
});

export default {
  query: (text, params) => pool.query(text, params),
  pool
};

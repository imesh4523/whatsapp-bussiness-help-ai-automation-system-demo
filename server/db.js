import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Bypass self-signed SSL certificate issues on Digital Ocean PG
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';

// DO PG usually requires SSL. We configure it dynamically.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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

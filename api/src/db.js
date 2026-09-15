import pg from 'pg';

// Neon: use the POOLED connection string (host ends in -pooler).
// Serverless functions scale to zero and burst — the pooled endpoint
// plus a small local pool keeps you far from connection limits.
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30_000,
  ssl: { rejectUnauthorized: false },
});

export const query = (text, params) => pool.query(text, params);
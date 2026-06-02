/**
 * db/pool.js
 * PostgreSQL connection pool using pg-pool, optimized for Neon DB (serverless)
 */

import { Pool } from 'pg';

// ── Initialize connection pool with error handling ────────────────────────────
let pool;

try {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
    max: 10,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });
  console.log('✓ Database pool initialized');
} catch (error) {
  console.error('❌ Failed to initialize database pool:', error.message);
  process.exit(1);
}

// ── Pool error handler ─────────────────────────────────────────────────────────
pool.on('error', (error) => {
  console.error('❌ Database pool error:', error.message);
});

/**
 * Execute a parameterized query.
 * @param {string} text  - SQL query string
 * @param {Array}  params - Bound parameters
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('[DB Query]', {
        text: text.substring(0, 100),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
    }
    return result;
  } catch (err) {
    console.error('[DB Query Error]', { text: text.substring(0, 100), params, err: err.message });
    throw err;
  }
};

/**
 * Get a dedicated client for transactions.
 * IMPORTANT: Always call client.release() when done.
 */
const getClient = async () => {
  try {
    const client = await pool.connect();
    return client;
  } catch (error) {
    console.error('❌ Failed to get database client:', error.message);
    throw error;
  }
};

/**
 * Run a function inside a transaction with automatic rollback on error.
 * @param {Function} fn - async function receiving (client) as argument
 */
const withTransaction = async (fn) => {
  let client;
  try {
    client = await getClient();
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      if (client) {
        await client.query('ROLLBACK');
      }
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError.message);
    }
    console.error('❌ Transaction error:', err.message);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Health check query with error handling
 */
const ping = async () => {
  try {
    const { rows } = await query('SELECT NOW() AS now');
    if (!rows || rows.length === 0) {
      throw new Error('No response from database');
    }
    return rows[0].now;
  } catch (error) {
    console.error('❌ Database health check failed:', error.message);
    throw error;
  }
};

export { query, getClient, withTransaction, ping, pool };
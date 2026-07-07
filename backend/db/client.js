let pool;

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Configure a local or hosted Postgres database.");
  }
}

function sslConfig() {
  if (process.env.DATABASE_SSL === "false") return false;
  // Additive opt-in: default behavior (rejectUnauthorized: false) is
  // unchanged unless DATABASE_SSL_REJECT_UNAUTHORIZED is explicitly set to
  // "true", in which case certificate validation is enforced.
  const rejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
  return { rejectUnauthorized };
}

function getPool() {
  requireDatabaseUrl();
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig()
    });
  }
  return pool;
}

async function query(text, params = []) {
  const activePool = getPool();
  return activePool.query(text, params);
}

async function withTransaction(work) {
  const activePool = getPool();
  const client = await activePool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      // Ignore rollback failure; the original error is what matters.
    }
    throw error;
  } finally {
    client.release();
  }
}

async function closePool() {
  if (pool) await pool.end();
}

module.exports = { closePool, query, requireDatabaseUrl, withTransaction };

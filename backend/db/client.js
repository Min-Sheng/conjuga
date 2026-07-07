let pool;

function requireDatabaseUrl() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Configure a local or hosted Postgres database.");
  }
}

function getPool() {
  requireDatabaseUrl();
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false }
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

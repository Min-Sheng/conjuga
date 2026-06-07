require("../config/env");
const fs = require("node:fs/promises");
const path = require("node:path");
const { closePool, query } = require("../db/client");

async function main() {
  const schema = await fs.readFile(path.join(__dirname, "..", "db", "schema.sql"), "utf8");
  await query(schema);
  console.log("Database schema is ready.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);

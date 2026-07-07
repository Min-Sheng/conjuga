require("../config/env");
const fs = require("node:fs/promises");
const path = require("node:path");
const { closePool } = require("../db/client");
const { saveWord } = require("../services/wordBankService");

async function main() {
  const words = JSON.parse(await fs.readFile(path.join(__dirname, "..", "data", "words.json"), "utf8"));
  for (const word of words) {
    await saveWord(word, "json import");
  }
  console.log(`Imported ${words.length} words.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closePool);

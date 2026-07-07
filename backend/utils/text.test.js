const assert = require("node:assert/strict");
const test = require("node:test");

const { canonicalizeSpanishWord, normalize, uniqueNormalized } = require("./text");

test("normalize trims, lowercases, and strips diacritics", () => {
  assert.equal(normalize("  CAFÉ  "), "cafe");
  assert.equal(normalize("Niño"), "nino");
  assert.equal(normalize(""), "");
  assert.equal(normalize(undefined), "");
});

test("canonicalizeSpanishWord restores accents via the override table", () => {
  assert.equal(canonicalizeSpanishWord("cafe"), "café");
  assert.equal(canonicalizeSpanishWord("CAFE"), "café");
  assert.equal(canonicalizeSpanishWord("nino"), "niño");
  assert.equal(canonicalizeSpanishWord("manana"), "mañana");
});

test("canonicalizeSpanishWord passes through words not in the override table", () => {
  assert.equal(canonicalizeSpanishWord("perro"), "perro");
  assert.equal(canonicalizeSpanishWord("  Hola  "), "hola");
});

test("uniqueNormalized deduplicates by normalized form and drops empties", () => {
  assert.deepEqual(
    uniqueNormalized(["casa", "CASA", "  casa  ", "perro", ""]),
    ["casa", "perro"]
  );
});

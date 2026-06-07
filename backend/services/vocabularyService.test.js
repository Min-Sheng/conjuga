const assert = require("node:assert/strict");
const test = require("node:test");

const { inferFormKind } = require("./vocabularyService");

test("infers lemma and conjugated vocabulary forms separately", () => {
  assert.equal(inferFormKind("comer", "comer", "verbo"), "lemma");
  assert.equal(inferFormKind("comiste", "comer", "verbo"), "conjugated");
  assert.equal(inferFormKind("casas", "casa", "sustantivo"), "other");
});

test("honors an explicit valid form kind", () => {
  assert.equal(inferFormKind("hablé", "hablar", "verbo", "conjugated"), "conjugated");
});

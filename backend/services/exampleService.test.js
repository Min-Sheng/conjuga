const assert = require("node:assert/strict");
const test = require("node:test");

const { containsTargetWord } = require("./exampleService");

test("containsTargetWord finds an exact token match ignoring case and accents-in-source", () => {
  assert.equal(containsTargetWord("Uso casa en una frase.", "casa"), true);
  assert.equal(containsTargetWord("Uso CASA en una frase.", "casa"), true);
});

test("containsTargetWord returns false when the token is absent", () => {
  assert.equal(containsTargetWord("Uso perro en una frase.", "casa"), false);
});

test("containsTargetWord does not match substrings inside other words", () => {
  assert.equal(containsTargetWord("La casita es pequeña.", "casa"), false);
});

test("containsTargetWord handles multi-word targets via substring match", () => {
  assert.equal(containsTargetWord("Voy a la escuela hoy.", "a la escuela"), true);
  assert.equal(containsTargetWord("Voy a otro lugar hoy.", "a la escuela"), false);
});

test("containsTargetWord returns false for empty/missing target", () => {
  assert.equal(containsTargetWord("Cualquier frase.", ""), false);
  assert.equal(containsTargetWord("Cualquier frase.", undefined), false);
});

const assert = require("node:assert/strict");
const test = require("node:test");

const { sensesFromEntries } = require("./lexicalService");
const { applySenseTranslations } = require("./lookupService");

const bancoEntries = [
  {
    partOfSpeech: "noun",
    senses: [
      { definition: "bank (financial institution)" },
      { definition: "bench" },
      { definition: "pew" },
      { definition: "school (of fish)" },
      { definition: "sandbank" }
    ]
  },
  {
    partOfSpeech: "verb",
    senses: [{ definition: "first-person singular present indicative of bancar" }]
  }
];

test("sensesFromEntries maps parts, keeps order, and caps senses per part", () => {
  const senses = sensesFromEntries(bancoEntries, 3);
  assert.deepEqual(senses.map((sense) => sense.en), [
    "bank (financial institution)",
    "bench",
    "pew"
  ]);
  assert.ok(senses.every((sense) => sense.part === "sustantivo"));
  assert.ok(senses.every((sense) => sense.zh === ""));
});

test("sensesFromEntries drops inflection descriptions and blank definitions", () => {
  const senses = sensesFromEntries(bancoEntries);
  assert.ok(!senses.some((sense) => /bancar/.test(sense.en)));

  const withBlanks = sensesFromEntries([
    { partOfSpeech: "noun", senses: [{ definition: "  " }, { definition: "wife" }] }
  ]);
  assert.deepEqual(withBlanks.map((sense) => sense.en), ["wife"]);
});

test("sensesFromEntries always drops vulgar/offensive senses", () => {
  const senses = sensesFromEntries([
    {
      partOfSpeech: "noun",
      senses: [
        { definition: "spoon", tags: ["feminine"] },
        { definition: "a slur", tags: ["Guatemala", "vulgar", "feminine"] },
        { definition: "an insult", tags: ["offensive"] }
      ]
    }
  ]);
  assert.deepEqual(senses.map((sense) => sense.en), ["spoon"]);
});

test("sensesFromEntries drops informal senses only when standard ones exist", () => {
  const mixed = sensesFromEntries([
    {
      partOfSpeech: "noun",
      senses: [
        { definition: "spoon", tags: [] },
        { definition: "regional slang meaning", tags: ["colloquial"] }
      ]
    }
  ]);
  assert.deepEqual(mixed.map((sense) => sense.en), ["spoon"]);

  const informalOnly = sensesFromEntries([
    {
      partOfSpeech: "adjective",
      senses: [{ definition: "cool, great", tags: ["colloquial"] }]
    }
  ]);
  assert.deepEqual(informalOnly.map((sense) => sense.en), ["cool, great"]);
});

test("sensesFromEntries drops senses tagged as inflection forms", () => {
  const senses = sensesFromEntries([
    {
      partOfSpeech: "verb",
      senses: [{ definition: "something conjugated", tags: ["form of", "singular"] }]
    }
  ]);
  assert.deepEqual(senses, []);
});

test("sensesFromEntries keeps unmapped parts and defaults missing ones", () => {
  const senses = sensesFromEntries([
    { partOfSpeech: "phrase", senses: [{ definition: "greeting" }] },
    { senses: [{ definition: "mystery" }] }
  ]);
  assert.deepEqual(senses.map((sense) => sense.part), ["phrase", "unknown"]);
});

test("applySenseTranslations pairs translations by index and tolerates bad input", () => {
  const senses = [
    { part: "sustantivo", zh: "", en: "bank" },
    { part: "sustantivo", zh: "", en: "bench" },
    { part: "sustantivo", zh: "", en: "pew" }
  ];

  const paired = applySenseTranslations(senses, ["銀行", " 長凳 "]);
  assert.deepEqual(paired.map((sense) => sense.zh), ["銀行", "長凳", ""]);

  const malformed = applySenseTranslations(senses, { not: "an array" });
  assert.deepEqual(malformed.map((sense) => sense.zh), ["", "", ""]);

  const mixedTypes = applySenseTranslations(senses, ["銀行", 42, null]);
  assert.deepEqual(mixedTypes.map((sense) => sense.zh), ["銀行", "", ""]);
});

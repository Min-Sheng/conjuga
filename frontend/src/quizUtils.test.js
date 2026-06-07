import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChoiceQuestion,
  buildConjugationChoiceQuestion,
  buildFillQuestion,
  buildGeneralPool,
  evaluateFillAnswer,
  flattenConjugations,
  shuffle
} from "./quizUtils.js";

const zeroRandom = () => 0;

test("shuffle uses the injected random source without mutating input", () => {
  const input = [1, 2, 3, 4];
  assert.deepEqual(shuffle(input, zeroRandom), [2, 3, 4, 1]);
  assert.deepEqual(input, [1, 2, 3, 4]);
});

test("buildGeneralPool handles legacy words and future vocabulary entries", () => {
  const entries = [
    { id: "one", word: "casa" },
    { id: "two", surfaceForm: "hablé", formKind: "conjugated", word: { word: "hablar" } },
    { id: "three", surfaceForm: "comer", formKind: "lemma", word: { word: "comer" } }
  ];
  const progress = {
    one: { mastery: "mastered" },
    hablé: { mastery: "weak" }
  };

  assert.deepEqual(buildGeneralPool(entries).map(entry => entry.id), ["one", "three"]);
  assert.deepEqual(
    buildGeneralPool(entries, { includeConjugated: true, unfamiliarOnly: true, progress }).map(entry => entry.id),
    ["two", "three"]
  );
});

test("buildChoiceQuestion creates unique choices containing the surface form", () => {
  const target = { id: "target", surfaceForm: "hablé", word: { word: "hablar", zh: "說話" } };
  const pool = [
    target,
    { id: "a", word: "comer" },
    { id: "b", word: "vivir" },
    { id: "c", word: "comer" }
  ];
  const question = buildChoiceQuestion(target, pool, { random: zeroRandom });

  assert.equal(question.answer, "hablé");
  assert.match(question.prompt, /說話/);
  assert.ok(question.choices.includes("hablé"));
  assert.equal(new Set(question.choices).size, question.choices.length);
});

test("buildFillQuestion replaces a matching example and falls back to translation", () => {
  const withExample = buildFillQuestion({
    word: "café",
    zh: "咖啡",
    examples: [{ es: "Bebo café cada día.", zh: "我每天喝咖啡。" }]
  });
  assert.equal(withExample.prompt, "Bebo ____ cada día.");
  assert.equal(withExample.translationHint, "我每天喝咖啡。");

  const fallback = buildFillQuestion({ surfaceForm: "hablé", word: { word: "hablar", zh: "我說了" } });
  assert.match(fallback.prompt, /我說了/);
  assert.equal(fallback.answer, "hablé");
});

test("evaluateFillAnswer normalizes case and whitespace", () => {
  const question = { answer: "Casa", acceptedAnswers: ["la casa"], nearAnswers: ["hogar"] };
  assert.equal(evaluateFillAnswer("  CASA ", question).result, "correct");
  assert.equal(evaluateFillAnswer("la   casa", question).result, "correct");
  assert.equal(evaluateFillAnswer("HOGAR", question).result, "acceptable");
  assert.equal(evaluateFillAnswer("caso", question).result, "incorrect");
});

test("evaluateFillAnswer keeps accent differences incorrect with a hint", () => {
  const result = evaluateFillAnswer("cafe", { answer: "café" });
  assert.equal(result.result, "incorrect");
  assert.equal(result.accentDifference, true);
  assert.match(result.feedback, /重音/);
});

test("flattenConjugations filters mood and tense selections", () => {
  const result = {
    inputForm: "hablar",
    infinitive: "hablar",
    conjugations: {
      indicativo: {
        presente: [{ person: "yo", form: "hablo" }, { person: "tú", form: "hablas" }],
        futuro: [{ person: "yo", form: "hablaré" }]
      },
      subjuntivo: {
        presente: [{ person: "yo", form: "hable" }]
      }
    }
  };
  const forms = flattenConjugations(result, new Set(["indicativo:presente"]));

  assert.deepEqual(forms.map(item => item.form), ["hablo", "hablas"]);
  assert.equal(forms[0].targetWord, "hablar:indicativo:presente:yo");
});

test("buildConjugationChoiceQuestion prioritizes same verb and tense distractors", () => {
  const target = {
    infinitive: "hablar", mood: "indicativo", tense: "presente", person: "yo", form: "hablo"
  };
  const forms = [
    target,
    { infinitive: "hablar", mood: "indicativo", tense: "presente", person: "tú", form: "hablas" },
    { infinitive: "hablar", mood: "indicativo", tense: "presente", person: "él", form: "habla" },
    { infinitive: "hablar", mood: "indicativo", tense: "futuro", person: "yo", form: "hablaré" },
    { infinitive: "comer", mood: "indicativo", tense: "presente", person: "yo", form: "como" }
  ];
  const question = buildConjugationChoiceQuestion(target, forms, { choiceCount: 3, random: zeroRandom });

  assert.equal(question.answer, "hablo");
  assert.equal(question.choices.length, 3);
  assert.ok(question.choices.includes("hablas"));
  assert.ok(question.choices.includes("habla"));
  assert.ok(!question.choices.includes("hablaré"));
});

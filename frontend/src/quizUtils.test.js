import assert from "node:assert/strict";
import test from "node:test";

import {
  buildChoiceQuestion,
  buildConjugationChoiceQuestion,
  buildFillQuestion,
  buildGeneralPool,
  buildVerbQuizSession,
  buildWordQuizSession,
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

// Shared judge vectors (mirrored from backend/services/judgeVectors.test-data.js).
// These lock evaluateFillAnswer's "accepted / near / accentless" judging to the
// same behavior as backend judgeService.judgeAnswer's local judging tier, per
// .claude-work/refactor-plan.md Phase 0.5. Keep both copies in sync.
//
// Known divergence (not fixed here, per Phase 0's "lock current behavior"
// rule): judgeService's local tier normalizes via trim().toLowerCase() only,
// while evaluateFillAnswer also collapses internal whitespace via
// normalized(). So an answer like "la   casa" (extra internal spaces) is
// "correct" here but would be "incorrect" against the backend local judging
// tier. None of the vectors below exercise that gap.
const judgeVectors = [
  {
    id: "exact-match",
    targetWord: "casa",
    acceptedAnswers: [],
    nearAnswers: [],
    userAnswer: "casa",
    expectedResult: "correct"
  },
  {
    id: "case-insensitive",
    targetWord: "casa",
    acceptedAnswers: [],
    nearAnswers: [],
    userAnswer: "  CASA ",
    expectedResult: "correct"
  },
  {
    id: "accepted-alias",
    targetWord: "casa",
    acceptedAnswers: ["la casa"],
    nearAnswers: [],
    userAnswer: "la casa",
    expectedResult: "correct"
  },
  {
    id: "near-answer",
    targetWord: "casa",
    acceptedAnswers: ["la casa"],
    nearAnswers: ["hogar"],
    userAnswer: "HOGAR",
    expectedResult: "acceptable"
  },
  {
    id: "accent-difference",
    targetWord: "café",
    acceptedAnswers: [],
    nearAnswers: [],
    userAnswer: "cafe",
    expectedResult: "incorrect"
  },
  {
    id: "unrelated-wrong",
    targetWord: "casa",
    acceptedAnswers: ["la casa"],
    nearAnswers: ["hogar"],
    userAnswer: "caso",
    expectedResult: "incorrect"
  }
];

for (const vector of judgeVectors) {
  test(`evaluateFillAnswer[shared-vector]: ${vector.id}`, () => {
    const question = {
      answer: vector.targetWord,
      acceptedAnswers: vector.acceptedAnswers,
      nearAnswers: vector.nearAnswers
    };
    const result = evaluateFillAnswer(vector.userAnswer, question);
    assert.equal(result.result, vector.expectedResult, `vector ${vector.id}: expected ${vector.expectedResult}, got ${result.result}`);
  });
}

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

test("buildWordQuizSession builds choice questions from the filtered pool", () => {
  const entries = [
    { id: "one", word: "casa", zh: "房子" },
    { id: "two", surfaceForm: "hablé", formKind: "conjugated", word: { word: "hablar" } },
    { id: "three", surfaceForm: "comer", formKind: "lemma", word: { word: "comer" } }
  ];
  const { questions, poolSize } = buildWordQuizSession(entries, {
    questionType: "choice",
    size: 10,
    random: zeroRandom
  });

  // conjugated entry excluded by default (includeConjugated: false)
  assert.equal(poolSize, 2);
  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.equal(question.kind, "word");
    assert.equal(question.type, "choice");
    assert.ok(question.choices.includes(question.answer));
  }
});

test("buildWordQuizSession builds fill-in-the-blank questions when requested", () => {
  const entries = [
    { id: "one", word: "café", zh: "咖啡", examples: [{ es: "Bebo café cada día.", zh: "我每天喝咖啡。" }] }
  ];
  const { questions, poolSize } = buildWordQuizSession(entries, {
    questionType: "blank",
    size: 5,
    random: zeroRandom
  });

  assert.equal(poolSize, 1);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].kind, "word");
  assert.equal(questions[0].type, "blank");
  assert.equal(questions[0].sentence, "Bebo ____ cada día.");
});

test("buildWordQuizSession respects unfamiliarOnly filtering and empty pool", () => {
  const entries = [{ id: "one", word: "casa" }];
  const progress = { one: { mastery: "mastered" } };
  const { questions, poolSize } = buildWordQuizSession(entries, {
    unfamiliarOnly: true,
    progress,
    size: 5
  });

  assert.equal(poolSize, 0);
  assert.equal(questions.length, 0);
});

test("buildVerbQuizSession flattens conjugation results into choice questions", () => {
  const conjugationResults = [
    {
      inputForm: "hablar",
      infinitive: "hablar",
      conjugations: {
        indicativo: {
          presente: [{ person: "yo", form: "hablo" }, { person: "tú", form: "hablas" }]
        }
      }
    },
    null // simulates a failed api.conjugate() call, already caught upstream
  ];
  const { questions, poolSize } = buildVerbQuizSession(conjugationResults, {
    selectedTenses: ["indicativo:presente"],
    size: 10,
    random: zeroRandom,
    findWord: (infinitive) => ({ word: infinitive, id: "w1" }),
    tenseLabel: (tense) => tense
  });

  assert.equal(poolSize, 2);
  assert.equal(questions.length, 2);
  for (const question of questions) {
    assert.equal(question.kind, "verb");
    assert.equal(question.type, "choice");
    assert.equal(question.word.id, "w1");
  }
});

test("buildVerbQuizSession filters mastered targets when unfamiliarOnly is set", () => {
  const conjugationResults = [{
    inputForm: "hablar",
    infinitive: "hablar",
    conjugations: { indicativo: { presente: [{ person: "yo", form: "hablo" }] } }
  }];
  const progress = { "hablar:indicativo:presente:yo": { mastery: "mastered" } };
  const { questions, poolSize } = buildVerbQuizSession(conjugationResults, {
    selectedTenses: ["indicativo:presente"],
    unfamiliarOnly: true,
    progress,
    size: 10
  });

  assert.equal(poolSize, 0);
  assert.equal(questions.length, 0);
});

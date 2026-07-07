const assert = require("node:assert/strict");
const test = require("node:test");

const { judgeAnswer } = require("./judgeService");
const { judgeVectors } = require("./judgeVectors.test-data");

// judgeAnswer only reaches the AI fallback branch when userAnswer is not an
// exact/near/accentless match. None of the shared vectors below hit that
// branch (they are all resolved locally), so no network/AI mocking is needed.
for (const vector of judgeVectors) {
  test(`judgeAnswer[local]: ${vector.id}`, async () => {
    const result = await judgeAnswer({
      targetWord: vector.targetWord,
      acceptedAnswers: vector.acceptedAnswers,
      nearAnswers: vector.nearAnswers,
      userAnswer: vector.userAnswer,
      zh: "測試",
      en: "test"
    });
    assert.equal(result.result, vector.expectedResult, `vector ${vector.id}: expected ${vector.expectedResult}, got ${result.result}`);
  });
}

test("judgeAnswer marks exact target match as correct with acceptedWord echoing target", async () => {
  const result = await judgeAnswer({ targetWord: "casa", userAnswer: "casa", zh: "房子", en: "house" });
  assert.equal(result.result, "correct");
  assert.equal(result.correct, true);
  assert.equal(result.score, 1);
  assert.equal(result.acceptedWord, "casa");
});

test("judgeAnswer marks near answer as acceptable with acceptedWord echoing submission", async () => {
  const result = await judgeAnswer({ targetWord: "casa", nearAnswers: ["hogar"], userAnswer: "hogar", zh: "房子", en: "house" });
  assert.equal(result.result, "acceptable");
  assert.equal(result.acceptedWord, "hogar");
});

test("judgeAnswer flags accent-only difference as incorrect with accent guidance", async () => {
  const result = await judgeAnswer({ targetWord: "café", userAnswer: "cafe", zh: "咖啡", en: "coffee" });
  assert.equal(result.result, "incorrect");
  assert.match(result.feedback, /重音/);
});

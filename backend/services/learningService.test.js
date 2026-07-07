const assert = require("node:assert/strict");
const test = require("node:test");

const {
  masteryStatus,
  nextReviewState,
  qualityForResult,
  updateEaseFactor
} = require("./learningService");

test("qualityForResult maps result to SM-2 quality score", () => {
  assert.equal(qualityForResult("correct"), 5);
  assert.equal(qualityForResult("acceptable"), 4);
  assert.equal(qualityForResult("incorrect"), 2);
  assert.equal(qualityForResult("anything-else"), 2);
});

test("updateEaseFactor floors at 1.3 for repeated low quality", () => {
  let ease = 2.5;
  for (let i = 0; i < 20; i += 1) {
    ease = updateEaseFactor(ease, 2);
  }
  assert.equal(ease, 1.3);
});

test("updateEaseFactor increases ease factor for quality 5 and decreases for quality 3", () => {
  assert.equal(updateEaseFactor(2.5, 5), 2.6);
  assert.ok(updateEaseFactor(2.5, 3) < 2.5);
});

test("updateEaseFactor never returns below 1.3 even from a low starting point", () => {
  assert.equal(updateEaseFactor(1.3, 2), 1.3);
  assert.ok(updateEaseFactor(1.3, 2) >= 1.3);
});

test("nextReviewState resets repetition and interval to 1 day on incorrect", () => {
  const current = { repetition: 4, interval_days: 10, ease_factor: 2.6 };
  const next = nextReviewState(current, "incorrect");
  assert.equal(next.repetition, 0);
  assert.equal(next.intervalDays, 1);
  assert.equal(next.quality, 2);
});

test("nextReviewState grows repetition/interval sequence for consecutive correct answers", () => {
  let current = null;

  let next = nextReviewState(current, "correct");
  assert.equal(next.repetition, 1);
  assert.equal(next.intervalDays, 1);
  current = { repetition: next.repetition, interval_days: next.intervalDays, ease_factor: next.easeFactor };

  next = nextReviewState(current, "correct");
  assert.equal(next.repetition, 2);
  assert.equal(next.intervalDays, 3);
  current = { repetition: next.repetition, interval_days: next.intervalDays, ease_factor: next.easeFactor };

  next = nextReviewState(current, "correct");
  assert.equal(next.repetition, 3);
  assert.equal(next.intervalDays, Math.max(1, Math.round(3 * next.easeFactor)));
});

test("nextReviewState treats acceptable like a passing quality (repetition grows)", () => {
  const current = { repetition: 1, interval_days: 1, ease_factor: 2.5 };
  const next = nextReviewState(current, "acceptable");
  assert.equal(next.repetition, 2);
  assert.equal(next.quality, 4);
});

test("nextReviewState answering wrong after streak resets to repetition 0", () => {
  const current = { repetition: 3, interval_days: 8, ease_factor: 2.5 };
  const next = nextReviewState(current, "incorrect");
  assert.equal(next.repetition, 0);
  assert.equal(next.intervalDays, 1);
});

test("masteryStatus returns weak for null row, incorrect last result, or zero repetition", () => {
  assert.equal(masteryStatus(null), "weak");
  assert.equal(masteryStatus({ last_result: "incorrect", repetition: 3, due_at: new Date(Date.now() + 86400000) }), "weak");
  assert.equal(masteryStatus({ last_result: "correct", repetition: 0, due_at: new Date(Date.now() + 86400000) }), "weak");
});

test("masteryStatus returns mastered when repetition >= 3 and due_at is in the future", () => {
  const row = {
    last_result: "correct",
    repetition: 3,
    due_at: new Date(Date.now() + 86400000)
  };
  assert.equal(masteryStatus(row), "mastered");
});

test("masteryStatus returns learning when repetition < 3 (but not zero) and last result is not incorrect", () => {
  const row = {
    last_result: "correct",
    repetition: 1,
    due_at: new Date(Date.now() + 86400000)
  };
  assert.equal(masteryStatus(row), "learning");
});

test("masteryStatus returns learning when repetition >= 3 but due_at is in the past", () => {
  const row = {
    last_result: "correct",
    repetition: 5,
    due_at: new Date(Date.now() - 86400000)
  };
  assert.equal(masteryStatus(row), "learning");
});

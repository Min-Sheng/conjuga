// Shared local-judging test vectors for backend judgeService and frontend quizUtils.
// Keep this file's cases mirrored in frontend/src/quizUtils.test.js so both
// implementations of "accepted / near / accentless" fill-answer judging are
// locked to the same behavior. See .claude-work/refactor-plan.md Phase 0.5.
//
// Each vector describes a fill-in-the-blank answer judgment case:
// - targetWord: the canonical correct answer
// - acceptedAnswers / nearAnswers: alternates
// - userAnswer: submitted answer
// - expectedResult: "correct" | "acceptable" | "incorrect"
//
// NOTE ON KNOWN FRONTEND/BACKEND DIVERGENCE (locked, not fixed, per Phase 0 rule):
// - judgeService.judgeAnswer normalizes only via trim().toLowerCase() for the
//   accepted/near tiers (spanishQuizKey), while quizUtils.evaluateFillAnswer
//   normalizes via trim + collapse-whitespace + toLocaleLowerCase("es").
//   This means "  la   casa" (extra internal whitespace) is judged "incorrect"
//   by the backend local path (whitespace not collapsed) but "correct" by the
//   frontend. This divergence is intentionally recorded here, not fixed, per
//   Phase 0's "lock current behavior" rule. See vector id "whitespace-collapse".
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

module.exports = { judgeVectors };

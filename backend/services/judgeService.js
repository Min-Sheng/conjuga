const { callAiJson } = require("./aiService");
const { normalize } = require("../utils/text");

const VALID_RESULTS = new Set(["correct", "acceptable", "incorrect"]);

function spanishQuizKey(text) {
  return String(text || "").trim().toLowerCase();
}

async function judgeAnswer(payload) {
  const quizKey = spanishQuizKey(payload.userAnswer);
  const accepted = [payload.targetWord, ...(payload.acceptedAnswers || [])].map(spanishQuizKey);
  const near = (payload.nearAnswers || []).map(spanishQuizKey);

  if (accepted.includes(quizKey)) {
    return {
      result: "correct",
      correct: true,
      score: 1,
      feedback: `答對了：${payload.targetWord} 是 ${payload.zh}。`,
      acceptedWord: payload.targetWord
    };
  }

  if (near.includes(quizKey)) {
    return {
      result: "acceptable",
      correct: true,
      score: 0.8,
      feedback: `${payload.userAnswer} 可以接受；本題目標字是 ${payload.targetWord}。`,
      acceptedWord: payload.userAnswer
    };
  }

  const accentlessAccepted = [payload.targetWord, ...(payload.acceptedAnswers || []), ...(payload.nearAnswers || [])].map(normalize);
  if (accentlessAccepted.includes(normalize(payload.userAnswer))) {
    return {
      result: "incorrect",
      correct: false,
      score: 0,
      feedback: `拼寫接近，但測驗需使用完整西文拼寫：${payload.targetWord}。請注意重音符號與 ñ。`
    };
  }

  const fallback = {
    result: "incorrect",
    correct: false,
    score: 0,
    feedback: `這題目標字是 ${payload.targetWord}：${payload.zh} / ${payload.en}。`
  };

  const aiResult = await callAiJson(
    [
      {
        role: "system",
        content:
          "Return only JSON. Judge a beginner Spanish fill-in answer. result must be correct, acceptable, or incorrect. Require proper Spanish orthography, including accents and ñ. Do not mark accentless spellings or n-for-ñ spellings as correct or acceptable when the target requires those marks. Give brief Traditional Chinese feedback."
      },
      {
        role: "user",
        content: JSON.stringify({
          schema: { result: "correct|acceptable|incorrect", correct: true, score: 0.8, feedback: "繁體中文回饋" },
          question: payload
        })
      }
    ],
    fallback
  );

  if (!aiResult || !VALID_RESULTS.has(aiResult.result)) {
    return fallback;
  }
  return aiResult;
}

module.exports = { judgeAnswer };

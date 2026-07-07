const { readJsonBody, sendJson } = require("./utils/http");
const { loadWordBank } = require("./services/wordBankService");
const { lookupWithSurfaceForm } = require("./services/lookupService");
const { generateExamples } = require("./services/exampleService");
const { synthesizeSpeech } = require("./services/speechService");
const { judgeAnswer } = require("./services/judgeService");
const { getProgress, recordQuizAttempt } = require("./services/learningService");
const { lookupVerb } = require("./services/verbService");
const { listVocabulary, removeVocabularyEntry, saveVocabularyEntry } = require("./services/vocabularyService");
const { isValidUuid } = require("./utils/validation");

// Only rejects when a learnerId value is actually present but malformed;
// absent/empty learnerId keeps existing "anonymous" behavior for endpoints
// that already tolerate it (e.g. recordLookup).
function hasInvalidLearnerId(learnerId) {
  return Boolean(learnerId) && !isValidUuid(learnerId);
}

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/verbs/lookup") {
    sendJson(response, 200, await lookupVerb(url.searchParams.get("q")));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/words") {
    sendJson(response, 200, await loadWordBank());
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/vocabulary") {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    sendJson(response, 200, await listVocabulary(learnerId));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/vocabulary") {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    const entry = await saveVocabularyEntry(body);
    if (!entry) {
      sendJson(response, 400, { error: "learnerId and word (or wordId) are required" });
      return true;
    }
    sendJson(response, 201, entry);
    return true;
  }

  const vocabularyPath = url.pathname.match(/^\/api\/vocabulary\/([^/]+)$/);
  if (vocabularyPath && request.method === "DELETE") {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    sendJson(
      response,
      200,
      await removeVocabularyEntry(learnerId, decodeURIComponent(vocabularyPath[1]))
    );
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/lookup") {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    sendJson(response, 200, await lookupWithSurfaceForm(body));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/examples") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await generateExamples(body.word));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/pronunciation") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await synthesizeSpeech(body.text));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/judge-answer") {
    const body = await readJsonBody(request);
    sendJson(response, 200, await judgeAnswer(body));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/quiz-attempts") {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    sendJson(response, 200, await recordQuizAttempt(body));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/progress") {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) {
      sendJson(response, 400, { error: "learnerId must be a valid UUID" });
      return true;
    }
    sendJson(response, 200, await getProgress(learnerId));
    return true;
  }

  return false;
}

module.exports = { handleApi };

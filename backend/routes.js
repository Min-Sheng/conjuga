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
// that already tolerate it (e.g. recordLookup via lookupWithSurfaceForm).
function hasInvalidLearnerId(learnerId) {
  return Boolean(learnerId) && !isValidUuid(learnerId);
}

function invalidLearnerIdResponse(response) {
  sendJson(response, 400, { error: "learnerId must be a valid UUID" });
}

// Declarative route table: [method, pattern, handler]. `pattern` is either
// an exact pathname string or a RegExp; when a RegExp is used its capture
// groups are passed to the handler as `params`. Each handler receives
// (request, response, context) where context = { url, params }.
const routes = [
  ["GET", "/api/health", async (request, response) => {
    sendJson(response, 200, { status: "ok" });
  }],

  ["GET", "/api/verbs/lookup", async (request, response, { url }) => {
    sendJson(response, 200, await lookupVerb(url.searchParams.get("q")));
  }],

  ["GET", "/api/words", async (request, response) => {
    sendJson(response, 200, await loadWordBank());
  }],

  ["GET", "/api/vocabulary", async (request, response, { url }) => {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) return invalidLearnerIdResponse(response);
    sendJson(response, 200, await listVocabulary(learnerId));
  }],

  ["POST", "/api/vocabulary", async (request, response) => {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) return invalidLearnerIdResponse(response);
    const entry = await saveVocabularyEntry(body);
    if (!entry) {
      sendJson(response, 400, { error: "learnerId and word (or wordId) are required" });
      return;
    }
    sendJson(response, 201, entry);
  }],

  ["DELETE", /^\/api\/vocabulary\/([^/]+)$/, async (request, response, { url, params }) => {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) return invalidLearnerIdResponse(response);
    sendJson(response, 200, await removeVocabularyEntry(learnerId, decodeURIComponent(params[0])));
  }],

  ["POST", "/api/lookup", async (request, response) => {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) return invalidLearnerIdResponse(response);
    sendJson(response, 200, await lookupWithSurfaceForm(body));
  }],

  ["POST", "/api/examples", async (request, response) => {
    const body = await readJsonBody(request);
    sendJson(response, 200, await generateExamples(body.word));
  }],

  ["POST", "/api/pronunciation", async (request, response) => {
    const body = await readJsonBody(request);
    sendJson(response, 200, await synthesizeSpeech(body.text));
  }],

  ["POST", "/api/judge-answer", async (request, response) => {
    const body = await readJsonBody(request);
    sendJson(response, 200, await judgeAnswer(body));
  }],

  ["POST", "/api/quiz-attempts", async (request, response) => {
    const body = await readJsonBody(request);
    if (hasInvalidLearnerId(body.learnerId)) return invalidLearnerIdResponse(response);
    sendJson(response, 200, await recordQuizAttempt(body));
  }],

  ["GET", "/api/progress", async (request, response, { url }) => {
    const learnerId = url.searchParams.get("learnerId");
    if (hasInvalidLearnerId(learnerId)) return invalidLearnerIdResponse(response);
    sendJson(response, 200, await getProgress(learnerId));
  }]
];

function matchRoute(method, pathname) {
  for (const [routeMethod, pattern, handler] of routes) {
    if (routeMethod !== method) continue;
    if (typeof pattern === "string") {
      if (pattern === pathname) return { handler, params: [] };
    } else {
      const match = pattern.exec(pathname);
      if (match) return { handler, params: match.slice(1) };
    }
  }
  return null;
}

async function handleApi(request, response, url) {
  const matched = matchRoute(request.method, url.pathname);
  if (!matched) return false;
  await matched.handler(request, response, { url, params: matched.params });
  return true;
}

module.exports = { handleApi };

const { readJsonBody, sendJson } = require("./utils/http");
const { loadWordBank, saveWord } = require("./services/wordBankService");
const { lookupWord } = require("./services/lookupService");
const { generateExamples } = require("./services/exampleService");
const { synthesizeSpeech } = require("./services/speechService");
const { judgeAnswer } = require("./services/judgeService");
const { getLookupHistory, getProgress, recordLookup, recordQuizAttempt } = require("./services/learningService");
const { listSavedVerbs, lookupVerb, removeVerb, saveVerb } = require("./services/verbService");
const { listVocabulary, saveVocabularyEntry } = require("./services/vocabularyService");

async function handleApi(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    sendJson(response, 200, { status: "ok" });
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/verbs/lookup") {
    sendJson(response, 200, await lookupVerb(url.searchParams.get("q")));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/verbs") {
    sendJson(response, 200, await listSavedVerbs(url.searchParams.get("learnerId")));
    return true;
  }

  const verbPath = url.pathname.match(/^\/api\/verbs\/([^/]+)$/);
  if (verbPath && request.method === "POST") {
    const body = await readJsonBody(request);
    sendJson(response, 201, await saveVerb(body.learnerId, decodeURIComponent(verbPath[1])));
    return true;
  }

  if (verbPath && request.method === "DELETE") {
    sendJson(response, 200, await removeVerb(url.searchParams.get("learnerId"), decodeURIComponent(verbPath[1])));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/words") {
    sendJson(response, 200, await loadWordBank());
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/vocabulary") {
    sendJson(response, 200, await listVocabulary(url.searchParams.get("learnerId")));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/words") {
    const body = await readJsonBody(request);
    sendJson(response, 200, { word: await saveWord(body.word, "manual api") });
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/lookup") {
    const body = await readJsonBody(request);
    const result = await lookupWord(body.word);
    const vocabulary = await saveVocabularyEntry({
      learnerId: body.learnerId,
      word: result.word,
      surfaceForm: body.surfaceForm || body.word,
      lemma: body.lemma || result.word?.word,
      formKind: body.formKind,
      mood: body.mood,
      tense: body.tense,
      person: body.person
    });
    await recordLookup({
      learnerId: body.learnerId,
      wordId: result.word?.id,
      queryText: body.surfaceForm || body.word,
      source: result.source
    });
    sendJson(response, 200, { ...result, vocabulary });
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
    sendJson(response, 200, await recordQuizAttempt(body));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/progress") {
    sendJson(response, 200, await getProgress(url.searchParams.get("learnerId")));
    return true;
  }

  if (request.method === "GET" && url.pathname === "/api/lookup-history") {
    sendJson(response, 200, await getLookupHistory(url.searchParams.get("learnerId")));
    return true;
  }

  return false;
}

module.exports = { handleApi };

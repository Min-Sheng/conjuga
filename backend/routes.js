const { readJsonBody, sendJson } = require("./utils/http");
const { loadWordBank, saveWord } = require("./services/wordBankService");
const { lookupWord } = require("./services/lookupService");
const { generateExamples } = require("./services/exampleService");
const { synthesizeSpeech } = require("./services/speechService");
const { judgeAnswer } = require("./services/judgeService");
const { getLookupHistory, getProgress, recordLookup, recordQuizAttempt } = require("./services/learningService");
const { lookupVerb } = require("./services/verbService");
const { listVocabulary, removeVocabularyEntry, saveVocabularyEntry } = require("./services/vocabularyService");

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
    sendJson(response, 200, await listVocabulary(url.searchParams.get("learnerId")));
    return true;
  }

  if (request.method === "POST" && url.pathname === "/api/vocabulary") {
    const body = await readJsonBody(request);
    sendJson(response, 201, await saveVocabularyEntry(body));
    return true;
  }

  const vocabularyPath = url.pathname.match(/^\/api\/vocabulary\/([^/]+)$/);
  if (vocabularyPath && request.method === "DELETE") {
    sendJson(
      response,
      200,
      await removeVocabularyEntry(url.searchParams.get("learnerId"), decodeURIComponent(vocabularyPath[1]))
    );
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
    const surfaceForm = String(body.surfaceForm || body.word || "").trim().toLowerCase();
    let responseWord = result.word;
    if (surfaceForm && surfaceForm !== result.word?.word) {
      const generated = await generateExamples({ ...result.word, word: surfaceForm });
      const firstExample = generated.examples.find((example) =>
        String(example.es || "").toLowerCase().includes(surfaceForm)
      );
      if (firstExample) {
        responseWord = {
          ...result.word,
          examples: [
            firstExample,
            ...(result.word.examples || []).filter((example) => example.es !== firstExample.es)
          ].slice(0, 2)
        };
      }
    }
    await recordLookup({
      learnerId: body.learnerId,
      wordId: result.word?.id,
      queryText: surfaceForm || body.word,
      source: result.source
    });
    sendJson(response, 200, { ...result, word: responseWord });
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

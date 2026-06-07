const { query } = require("../db/client");
const { ensureLearner } = require("./learningService");
const { translateText } = require("./translationService");

const nlpServiceUrl = (process.env.NLP_SERVICE_URL || "http://localhost:8000").replace(/\/$/, "");

async function requestNlp(path) {
  const response = await fetch(`${nlpServiceUrl}${path}`, {
    signal: AbortSignal.timeout(Number(process.env.NLP_TIMEOUT_MS) || 20000)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.detail || "Verb analysis failed");
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

async function lookupVerb(rawQuery) {
  const input = String(rawQuery || "").trim().toLowerCase();
  if (!input) {
    const error = new Error("A Spanish verb form is required");
    error.statusCode = 400;
    throw error;
  }

  const result = await requestNlp(`/verbs/lookup?q=${encodeURIComponent(input)}`);
  let english = "";
  try {
    english = await translateText(result.infinitive, "en");
  } catch {
    // Conjugation remains useful when the translation provider is unavailable.
  }

  return {
    ...result,
    meanings: english ? [english] : []
  };
}

async function listSavedVerbs(learnerId) {
  if (!learnerId) return [];
  const result = await query(
    `select infinitive, created_at as "createdAt"
     from verb_vocabulary
     where learner_id = $1
     order by created_at desc`,
    [learnerId]
  );
  return result.rows;
}

async function saveVerb(learnerId, rawInfinitive) {
  if (!learnerId) {
    const error = new Error("learnerId is required");
    error.statusCode = 400;
    throw error;
  }
  const infinitive = String(rawInfinitive || "").trim().toLowerCase();
  await ensureLearner(learnerId);
  const result = await query(
    `insert into verb_vocabulary (learner_id, infinitive)
     values ($1, $2)
     on conflict (learner_id, infinitive) do update set infinitive = excluded.infinitive
     returning infinitive, created_at as "createdAt"`,
    [learnerId, infinitive]
  );
  return result.rows[0];
}

async function removeVerb(learnerId, rawInfinitive) {
  if (!learnerId) return { removed: false };
  const result = await query(
    "delete from verb_vocabulary where learner_id = $1 and infinitive = $2",
    [learnerId, String(rawInfinitive || "").trim().toLowerCase()]
  );
  return { removed: result.rowCount > 0 };
}

module.exports = { listSavedVerbs, lookupVerb, removeVerb, saveVerb };

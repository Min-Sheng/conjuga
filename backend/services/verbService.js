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
  return result;
}

module.exports = { lookupVerb };

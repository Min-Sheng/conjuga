async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || data.detail || `Request failed: ${response.status}`);
  return data;
}

export const api = {
  words: () => request("/api/words"),
  lookup: (word, learnerId, vocabulary = {}) =>
    request("/api/lookup", { method: "POST", body: JSON.stringify({ word, learnerId, ...vocabulary }) }),
  progress: (learnerId) => request(`/api/progress?learnerId=${encodeURIComponent(learnerId)}`),
  examples: (word) => request("/api/examples", { method: "POST", body: JSON.stringify({ word }) }),
  pronunciation: (text) =>
    request("/api/pronunciation", { method: "POST", body: JSON.stringify({ text }) }),
  recordAttempt: (payload) =>
    request("/api/quiz-attempts", { method: "POST", body: JSON.stringify(payload) }),
  judgeAnswer: (payload) =>
    request("/api/judge-answer", { method: "POST", body: JSON.stringify(payload) }),
  vocabulary: (learnerId) => request(`/api/vocabulary?learnerId=${encodeURIComponent(learnerId)}`),
  conjugate: (query) => request(`/api/verbs/lookup?q=${encodeURIComponent(query)}`),
  savedVerbs: (learnerId) => request(`/api/verbs?learnerId=${encodeURIComponent(learnerId)}`),
  saveVerb: (infinitive, learnerId) =>
    request(`/api/verbs/${encodeURIComponent(infinitive)}`, {
      method: "POST",
      body: JSON.stringify({ learnerId })
    }),
  removeVerb: (infinitive, learnerId) =>
    request(`/api/verbs/${encodeURIComponent(infinitive)}?learnerId=${encodeURIComponent(learnerId)}`, {
      method: "DELETE"
    })
};

async function callAiJson(messages, fallback) {
  const provider = process.env.AI_PROVIDER || "groq";
  const apiKey =
    process.env.AI_API_KEY ||
    (provider === "groq" ? process.env.GROQ_API_KEY : "") ||
    process.env.OPENAI_API_KEY;
  if (!apiKey) return fallback;

  const apiUrl =
    process.env.AI_API_URL ||
    (provider === "groq" ? "https://api.groq.com/openai/v1/chat/completions" : "https://api.openai.com/v1/chat/completions");
  const model = process.env.AI_MODEL || (provider === "groq" ? "llama-3.1-8b-instant" : "gpt-4.1-mini");

  let response;
  try {
    response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages
      })
    });
  } catch (error) {
    return fallback;
  }

  if (!response.ok) return fallback;
  let data;
  try {
    data = await response.json();
  } catch (error) {
    return fallback;
  }
  try {
    return JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch (error) {
    return fallback;
  }
}

module.exports = { callAiJson };

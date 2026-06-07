async function synthesizeSpeech(text) {
  const apiKey = process.env.GOOGLE_TTS_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) return { audioDataUrl: "", source: "browser fallback" };

  const url = new URL("https://texttospeech.googleapis.com/v1/text:synthesize");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: "es-ES", ssmlGender: "FEMALE" },
      audioConfig: { audioEncoding: "MP3", speakingRate: 0.9 }
    })
  });

  if (!response.ok) return { audioDataUrl: "", source: "browser fallback" };
  const data = await response.json();
  return {
    audioDataUrl: data.audioContent ? `data:audio/mp3;base64,${data.audioContent}` : "",
    source: "Google Cloud Text-to-Speech"
  };
}

module.exports = { synthesizeSpeech };

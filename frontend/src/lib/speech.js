import { api } from "../api";

export async function speakSpanish(text) {
  try {
    const result = await api.pronunciation(text);
    if (result.audioDataUrl) {
      await new Audio(result.audioDataUrl).play();
      return;
    }
  } catch {
    // Browser speech is the offline fallback.
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

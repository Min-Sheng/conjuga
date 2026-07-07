const UUID_V4_TEMPLATE = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
// Combining diacritical marks block (U+0300-U+036F), built from char codes
// to avoid embedding literal combining characters in this source file.
const COMBINING_DIACRITICS_RE = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`,
  "g"
);

// Compliant UUIDv4 fallback for environments without crypto.randomUUID
// (e.g. non-secure-context http deployments). The backend validates
// learnerId as a UUID (backend/utils/validation.js), so the fallback must
// produce a real UUIDv4, not an ad-hoc string like `learner-${Date.now()}`.
function generateUuidV4Fallback() {
  return UUID_V4_TEMPLATE.replace(/[xy]/g, (character) => {
    const random = (Math.random() * 16) | 0;
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export const makeId = () => globalThis.crypto?.randomUUID?.() || generateUuidV4Fallback();

export const normalize = (value) =>
  String(value || "").trim().toLowerCase().normalize("NFD").replace(COMBINING_DIACRITICS_RE, "");

export const isVerb = (word) =>
  normalize(word?.part) === "verbo" || (word?.tags || []).some((tag) => normalize(tag) === "verbo");

export const isInfinitiveVerb = (word) => {
  const value = normalize(word?.word);
  return isVerb(word) && /(?:ar|er|ir)(?:se)?$/.test(value);
};

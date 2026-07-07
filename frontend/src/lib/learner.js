import { makeId } from "./wordUtils";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const LEARNER_ID_KEY = "palabraLearnerId";
const USER_NAME_KEY = "palabraUserName";
const ONBOARDED_KEY = "palabraOnboarded";
const PROGRESS_KEY = "palabraProgress";

// A4 fix: existing localStorage values from before the UUID fallback fix
// (e.g. "learner-1699999999999") are not valid UUIDs and would be rejected
// by the backend's learnerId validation. Regenerate and overwrite them.
export function getLearnerId() {
  let id = localStorage.getItem(LEARNER_ID_KEY);
  if (!id || !UUID_RE.test(id)) {
    id = makeId();
    localStorage.setItem(LEARNER_ID_KEY, id);
  }
  return id;
}

export function getStoredUserName() {
  return localStorage.getItem(USER_NAME_KEY) || "學習者";
}

export function setStoredUserName(name) {
  localStorage.setItem(USER_NAME_KEY, name);
}

export function isOnboarded() {
  return Boolean(localStorage.getItem(ONBOARDED_KEY));
}

export function setOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, "true");
}

export function getStoredProgress() {
  return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
}

export function setStoredProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

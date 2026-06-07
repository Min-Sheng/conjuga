function text(value) {
  return String(value ?? "").trim();
}

function normalized(value) {
  return text(value).replace(/\s+/g, " ").toLocaleLowerCase("es");
}

function accentless(value) {
  return normalized(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function entryWord(entry) {
  if (typeof entry?.word === "string") return entry.word;
  return entry?.surfaceForm || entry?.word?.word || entry?.lemma || "";
}

function entryKey(entry) {
  return entry?.id || entry?.vocabularyId || entry?.surfaceForm || entryWord(entry);
}

function progressFor(entry, progress) {
  if (!progress) return undefined;
  const keys = [
    entry?.id,
    entry?.vocabularyId,
    entry?.surfaceForm,
    entryWord(entry),
    entry?.word?.id,
    entry?.word?.word
  ].filter(Boolean);
  for (const key of keys) {
    if (progress instanceof Map && progress.has(key)) return progress.get(key);
    if (!(progress instanceof Map) && Object.hasOwn(progress, key)) return progress[key];
  }
  return undefined;
}

function uniqueTexts(values) {
  const seen = new Set();
  return values.filter((value) => {
    const key = normalized(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameTense(left, right) {
  return left.infinitive === right.infinitive &&
    left.mood === right.mood &&
    left.tense === right.tense;
}

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function buildGeneralPool(entries, {
  includeConjugated = false,
  unfamiliarOnly = false,
  progress = {}
} = {}) {
  return (entries || []).filter((entry) => {
    const formKind = normalized(entry?.formKind || entry?.kind || "lemma");
    if (!includeConjugated && formKind === "conjugated") return false;
    if (!unfamiliarOnly) return true;
    return progressFor(entry, progress)?.mastery !== "mastered";
  });
}

export function buildChoiceQuestion(target, entries, {
  choiceCount = 4,
  random = Math.random
} = {}) {
  const answer = entryWord(target);
  const distractors = uniqueTexts(
    shuffle((entries || []).filter((entry) => entryKey(entry) !== entryKey(target)), random)
      .map(entryWord)
  ).filter((choice) => normalized(choice) !== normalized(answer));
  const choices = shuffle([answer, ...distractors.slice(0, Math.max(0, choiceCount - 1))], random);
  const word = typeof target?.word === "object" ? target.word : target;
  const translation = word?.zh || target?.zh || word?.en || target?.en || "";

  return {
    kind: "word-choice",
    word,
    entry: target,
    title: "單字詞義",
    prompt: translation ? `選出「${translation}」對應的西班牙文` : "選出正確的西班牙文",
    answer,
    targetWord: answer,
    choices
  };
}

export function buildFillQuestion(entry) {
  const word = typeof entry?.word === "object" ? entry.word : entry;
  const answer = entryWord(entry);
  const examples = entry?.examples || word?.examples || [];
  const example = examples.find((item) => {
    const sentence = typeof item === "string" ? item : item?.es;
    return sentence && sentence.toLocaleLowerCase("es").includes(answer.toLocaleLowerCase("es"));
  });
  let prompt;
  let translationHint = "";

  if (example) {
    const sentence = typeof example === "string" ? example : example.es;
    const start = sentence.toLocaleLowerCase("es").indexOf(answer.toLocaleLowerCase("es"));
    prompt = `${sentence.slice(0, start)}${"_".repeat(Math.max(4, answer.length))}${sentence.slice(start + answer.length)}`;
    translationHint = typeof example === "string" ? "" : example.zh || example.en || "";
  } else {
    translationHint = word?.zh || entry?.zh || word?.en || entry?.en || "";
    prompt = translationHint
      ? `請填入「${translationHint}」對應的西班牙文`
      : "請填入正確的西班牙文";
  }

  return {
    kind: "word-fill",
    word,
    entry,
    title: "例句填空",
    prompt,
    translationHint,
    answer,
    targetWord: answer,
    acceptedAnswers: entry?.acceptedAnswers || word?.acceptedAnswers || [],
    nearAnswers: entry?.nearAnswers || word?.nearAnswers || []
  };
}

export function evaluateFillAnswer(userAnswer, question) {
  const answer = typeof question === "string"
    ? question
    : question?.answer || question?.targetWord || entryWord(question);
  const acceptedAnswers = typeof question === "object" ? question?.acceptedAnswers || [] : [];
  const nearAnswers = typeof question === "object" ? question?.nearAnswers || [] : [];
  const submitted = normalized(userAnswer);
  const correct = uniqueTexts([answer, ...acceptedAnswers]).map(normalized);
  const acceptable = uniqueTexts(nearAnswers).map(normalized);

  if (correct.includes(submitted)) {
    return { result: "correct", correct: true, score: 1, feedback: "答對了。" };
  }
  if (acceptable.includes(submitted)) {
    return {
      result: "acceptable",
      correct: true,
      score: 0.8,
      feedback: `答案可以接受；本題目標字是 ${answer}。`
    };
  }
  if (submitted && uniqueTexts([answer, ...acceptedAnswers, ...nearAnswers]).some(
    (candidate) => accentless(candidate) === accentless(submitted) && normalized(candidate) !== submitted
  )) {
    return {
      result: "incorrect",
      correct: false,
      score: 0,
      accentDifference: true,
      feedback: `拼寫接近，但請使用完整西文拼寫：${answer}。注意重音符號與 ñ。`
    };
  }
  return {
    result: "incorrect",
    correct: false,
    score: 0,
    feedback: `正確答案是 ${answer}。`
  };
}

export function flattenConjugations(result, selectedTenses) {
  const selected = selectedTenses == null
    ? null
    : new Set([...selectedTenses].map((item) => {
      if (typeof item === "string") return item;
      return `${item.mood}:${item.tense}`;
    }));
  const forms = [];

  for (const [mood, tenses] of Object.entries(result?.conjugations || {})) {
    for (const [tense, persons] of Object.entries(tenses || {})) {
      if (selected && !selected.has(`${mood}:${tense}`) && !selected.has(tense)) continue;
      for (const item of persons || []) {
        if (!item?.form) continue;
        forms.push({
          kind: "verb-conjugation",
          infinitive: result.infinitive,
          inputForm: result.inputForm,
          mood,
          tense,
          person: item.person || "",
          form: item.form,
          answer: item.form,
          targetWord: `${result.infinitive}:${mood}:${tense}:${item.person || ""}`
        });
      }
    }
  }
  return forms;
}

export function buildConjugationChoiceQuestion(target, forms, {
  choiceCount = 4,
  random = Math.random
} = {}) {
  const candidates = (forms || []).filter((item) => item !== target && normalized(item.form) !== normalized(target.form));
  const preferred = candidates.filter((item) => sameTense(item, target));
  const sameVerb = candidates.filter((item) => item.infinitive === target.infinitive && !sameTense(item, target));
  const others = candidates.filter((item) => item.infinitive !== target.infinitive);
  const distractors = uniqueTexts([
    ...shuffle(preferred, random).map((item) => item.form),
    ...shuffle(sameVerb, random).map((item) => item.form),
    ...shuffle(others, random).map((item) => item.form)
  ]).slice(0, Math.max(0, choiceCount - 1));

  return {
    kind: "verb-conjugation",
    title: `${target.infinitive} · ${target.tense}`,
    prompt: `${target.person || "指定形式"} 的正確變位是？`,
    answer: target.form,
    targetWord: target.targetWord || `${target.infinitive}:${target.mood}:${target.tense}:${target.person || ""}`,
    target,
    choices: shuffle([target.form, ...distractors], random)
  };
}

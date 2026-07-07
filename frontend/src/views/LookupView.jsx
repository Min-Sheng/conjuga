import { useEffect, useState } from "react";
import { api } from "../api";
import { MobileHeader, Empty } from "../components/primitives";
import { WordCard } from "../components/WordCard";
import { VerbConjugations } from "../components/verb/VerbConjugations";
import { isVerb, normalize } from "../lib/wordUtils";
import { speakSpanish } from "../lib/speech";

export function LookupView({ words, setWords, vocabulary, learnerId, currentWord, setCurrentWord, onVocabularyChanged }) {
  const [query, setQuery] = useState(currentWord?.word || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verbResult, setVerbResult] = useState(null);
  const [verbBusy, setVerbBusy] = useState(false);
  const [lookupEntry, setLookupEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const suggestions = query
    ? words.filter((word) => normalize(word.word).includes(normalize(query))).slice(0, 8)
    : words.slice(0, 8);

  async function lookup(value = query) {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    setVerbResult(null);
    try {
      let conjugation = null;
      try {
        conjugation = await api.conjugate(text);
      } catch {
        conjugation = null;
      }
      const lookupText = conjugation?.infinitive || text;
      const local = words.find((word) => normalize(word.word) === normalize(lookupText));
      const formMatch = conjugation?.matches?.[0] || {};
      const entry = {
        surfaceForm: text.toLowerCase(),
        lemma: conjugation?.infinitive || lookupText,
        formKind: conjugation?.formKind || (normalize(text) === normalize(lookupText) ? "lemma" : "other"),
        mood: formMatch.mood,
        tense: formMatch.tense,
        person: formMatch.person
      };
      const lookupResult = await api.lookup(lookupText, learnerId, entry);
      const word = lookupResult.word || local;
      setWords((items) => [word, ...items.filter((item) => item.id !== word.id)]);
      setCurrentWord({ ...word, lookupSurfaceForm: entry.surfaceForm, ...entry });
      setQuery(entry.surfaceForm);
      setVerbResult(conjugation);
      setLookupEntry({ ...entry, wordId: word.id });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!currentWord || !isVerb(currentWord)) {
      setVerbResult(null);
      return;
    }
    let active = true;
    setVerbBusy(true);
    api.conjugate(currentWord.lookupSurfaceForm || currentWord.word)
      .then((result) => { if (active) setVerbResult(result); })
      .catch(() => { if (active) setVerbResult(null); })
      .finally(() => { if (active) setVerbBusy(false); });
    return () => { active = false; };
  }, [currentWord?.word, currentWord?.lookupSurfaceForm]);

  useEffect(() => {
    if (!currentWord) return;
    setLookupEntry({
      wordId: currentWord.wordId || currentWord.id,
      surfaceForm: currentWord.lookupSurfaceForm || currentWord.word,
      lemma: currentWord.lemma || currentWord.canonicalWord || currentWord.word,
      formKind: currentWord.formKind || "lemma",
      mood: currentWord.mood,
      tense: currentWord.tense,
      person: currentWord.person
    });
  }, [currentWord]);

  const vocabularySaved = lookupEntry && vocabulary.some(
    (item) => normalize(item.surfaceForm) === normalize(lookupEntry.surfaceForm)
  );
  async function toggleVocabulary() {
    if (!lookupEntry || saving) return;
    setSaving(true);
    try {
      if (vocabularySaved) {
        await api.removeVocabulary(lookupEntry.surfaceForm, learnerId);
        onVocabularyChanged((items) => items.filter(
          (item) => normalize(item.surfaceForm) !== normalize(lookupEntry.surfaceForm)
        ));
      } else {
        const saved = await api.saveVocabulary({ learnerId, ...lookupEntry });
        if (saved) onVocabularyChanged((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      }
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(word) {
    setBusy(true);
    try {
      const targetForm = lookupEntry?.surfaceForm || word.lookupSurfaceForm || word.word;
      const result = await api.examples({ ...word, word: targetForm });
      const updated = { ...word, examples: result.examples };
      setCurrentWord(updated);
      setWords((items) => items.map((item) => item.id === updated.id ? updated : item));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="view is-active">
      <MobileHeader title="查詢" />
      <div className="ibv-view-heading"><p className="ibv-eyebrow">Diccionario</p><h2 className="ibv-page-h1">查詢西班牙文單字</h2></div>
      <form className="ibv-search-shell" onSubmit={(event) => { event.preventDefault(); lookup(); }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="casa, comer, feliz…" />
        <button type="button" className="ibv-btn ibv-btn-ghost" onClick={() => {
          const random = words[Math.floor(Math.random() * words.length)];
          if (random) lookup(random.word);
        }}>隨機</button>
        <button className="ibv-btn" disabled={busy}>{busy ? "查詢中…" : "查詢"}</button>
      </form>
      <div className="ibv-suggestions">
        {suggestions.map((word) => <button className="ibv-chip" key={word.id} onClick={() => lookup(word.word)}>{word.word}</button>)}
      </div>
      {busy ? <Empty title={`正在查詢「${query.trim()}」`}>正在整理詞義、例句與動詞分析。</Empty> :
        error ? <Empty title="查詢失敗">{error}</Empty> :
        <WordCard
          word={currentWord}
          onSpeak={speakSpanish}
          onRegenerate={regenerate}
          loading={busy}
          headerAction={lookupEntry && <button className={`ibv-btn ibv-save-word ${vocabularySaved ? "ibv-btn-ghost" : ""}`} onClick={toggleVocabulary} disabled={saving}>
            {saving ? "處理中…" : vocabularySaved ? "✓ 已加入單字庫" : "＋ 加入單字庫"}
          </button>}
        >
          {(verbBusy || verbResult) && <div className="word-verb-extension">
            <div className="word-verb-heading">
              <div>
                <p className="ibv-eyebrow">Conjugación</p>
                <h3>動詞變位</h3>
              </div>
            </div>
            {verbResult?.inputForm !== verbResult?.infinitive && <div className="verb-origin-card">
              <span className="ibv-eyebrow">Forma original</span>
              <p><i>{verbResult?.inputForm}</i> 的原形動詞是 <strong>{verbResult?.infinitive}</strong></p>
            </div>}
            {verbBusy && <p className="verb-loading">正在載入完整變位…</p>}
            {verbResult && <VerbConjugations result={verbResult} />}
          </div>}
        </WordCard>}
    </section>
  );
}

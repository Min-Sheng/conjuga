import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { MobileHeader, Empty } from "../components/primitives";
import { WordCard } from "../components/WordCard";
import { VerbConjugations } from "../components/verb/VerbConjugations";
import { isVerb, normalize } from "../lib/wordUtils";
import { speakSpanish } from "../lib/speech";

export function LookupView({ wordBank, setWordBank, vocabulary, learnerId, currentWord, setCurrentWord, onVocabularyChanged }) {
  const [query, setQuery] = useState(currentWord?.word || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [verbResult, setVerbResult] = useState(null);
  const [verbBusy, setVerbBusy] = useState(false);
  const [lookupEntry, setLookupEntry] = useState(null);
  // Set when the looked-up form is both a standalone word and a conjugation
  // (esposa: wife / esposar) — holds the standalone word's entry.
  const [surfaceWord, setSurfaceWord] = useState(null);
  const [saving, setSaving] = useState(false);
  // Tracks the surface form whose conjugation result is already loaded into
  // verbResult, so the currentWord-driven effect below doesn't re-fetch the
  // same conjugation that lookup() just fetched (dedup fix, Phase 3c).
  const loadedConjugationFormRef = useRef(null);
  const suggestions = query
    ? wordBank.filter((word) => normalize(word.word).includes(normalize(query))).slice(0, 8)
    : wordBank.slice(0, 8);

  async function lookup(value = query) {
    const text = value.trim();
    if (!text) return;
    setBusy(true);
    setError("");
    setVerbResult(null);
    setSurfaceWord(null);
    try {
      let conjugation = null;
      try {
        conjugation = await api.conjugate(text);
      } catch {
        conjugation = null;
      }
      const lookupText = conjugation?.infinitive || text;
      const local = wordBank.find((word) => normalize(word.word) === normalize(lookupText));
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
      const standalone = lookupResult.surfaceWord || null;
      setWordBank((items) => {
        let next = [word, ...items.filter((item) => item.id !== word.id)];
        if (standalone) next = [standalone, ...next.filter((item) => item.id !== standalone.id)];
        return next;
      });
      setSurfaceWord(standalone);
      loadedConjugationFormRef.current = entry.surfaceForm;
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
    const targetForm = currentWord.lookupSurfaceForm || currentWord.word;
    if (loadedConjugationFormRef.current === targetForm) {
      // lookup() already fetched and set verbResult for this exact form.
      return;
    }
    let active = true;
    setVerbBusy(true);
    api.conjugate(targetForm)
      .then((result) => {
        if (!active) return;
        loadedConjugationFormRef.current = targetForm;
        setVerbResult(result);
      })
      .catch(() => { if (active) setVerbResult(null); })
      .finally(() => { if (active) setVerbBusy(false); });
    return () => { active = false; };
  }, [currentWord?.word, currentWord?.lookupSurfaceForm]);

  useEffect(() => {
    if (!currentWord) return;
    setSurfaceWord((current) =>
      current && normalize(currentWord.lookupSurfaceForm || currentWord.word) === normalize(current.word)
        ? current
        : null
    );
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

  // Vocabulary is unique per surface form, so an ambiguous form gets one save
  // slot: the standalone (non-verb) reading wins when it exists.
  const activeEntry = surfaceWord
    ? { wordId: surfaceWord.id, surfaceForm: surfaceWord.word, lemma: surfaceWord.word, formKind: "lemma" }
    : lookupEntry;
  const vocabularySaved = activeEntry && vocabulary.some(
    (item) => normalize(item.surfaceForm) === normalize(activeEntry.surfaceForm)
  );
  async function toggleVocabulary() {
    if (!activeEntry || saving) return;
    setSaving(true);
    try {
      if (vocabularySaved) {
        await api.removeVocabulary(activeEntry.surfaceForm, learnerId);
        onVocabularyChanged((items) => items.filter(
          (item) => normalize(item.surfaceForm) !== normalize(activeEntry.surfaceForm)
        ));
      } else {
        const saved = await api.saveVocabulary({ learnerId, ...activeEntry });
        if (saved) onVocabularyChanged((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
      }
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function regenerate(word, applyUpdate = setCurrentWord, targetFormOverride = null) {
    setBusy(true);
    try {
      const targetForm = targetFormOverride || lookupEntry?.surfaceForm || word.lookupSurfaceForm || word.word;
      const result = await api.examples({ ...word, word: targetForm });
      const updated = { ...word, examples: result.examples };
      applyUpdate(updated);
      setWordBank((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  const saveButton = activeEntry && (
    <button className={`ibv-btn ibv-save-word ${vocabularySaved ? "ibv-btn-ghost" : ""}`} onClick={toggleVocabulary} disabled={saving}>
      {saving ? "處理中…" : vocabularySaved ? "✓ 已加入單字庫" : "＋ 加入單字庫"}
    </button>
  );

  return (
    <section className="view is-active">
      <MobileHeader title="查詢" />
      <div className="ibv-view-heading"><p className="ibv-eyebrow">Diccionario</p><h2 className="ibv-page-h1">查詢西班牙文單字</h2></div>
      <form className="ibv-search-shell" onSubmit={(event) => { event.preventDefault(); lookup(); }}>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="casa, comer, feliz…" />
        <button type="button" className="ibv-btn ibv-btn-ghost" onClick={() => {
          const random = wordBank[Math.floor(Math.random() * wordBank.length)];
          if (random) lookup(random.word);
        }}>隨機</button>
        <button className="ibv-btn" disabled={busy}>{busy ? "查詢中…" : "查詢"}</button>
      </form>
      <div className="ibv-suggestions">
        {suggestions.map((word) => <button className="ibv-chip" key={word.id} onClick={() => lookup(word.word)}>{word.word}</button>)}
      </div>
      {busy ? <Empty title={`正在查詢「${query.trim()}」`}>正在整理詞義、例句與動詞分析。</Empty> :
        error ? <Empty title="查詢失敗">{error}</Empty> :
        <>
        {surfaceWord && <>
          <WordCard
            word={surfaceWord}
            onSpeak={speakSpanish}
            onRegenerate={(word) => regenerate(word, setSurfaceWord, word.word)}
            loading={busy}
            headerAction={saveButton}
          />
          <div className="verb-origin-card">
            <span className="ibv-eyebrow">También verbo</span>
            <p><i>{surfaceWord.word}</i> 也是動詞 <strong>{currentWord?.word}</strong> 的變位，動詞解讀如下</p>
          </div>
        </>}
        <WordCard
          word={currentWord}
          onSpeak={speakSpanish}
          onRegenerate={regenerate}
          loading={busy}
          headerAction={!surfaceWord && saveButton}
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
        </WordCard>
        </>}
    </section>
  );
}

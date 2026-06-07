import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import {
  buildChoiceQuestion,
  buildConjugationChoiceQuestion,
  buildFillQuestion,
  buildGeneralPool,
  evaluateFillAnswer,
  flattenConjugations,
  shuffle
} from "./quizUtils";
import { moodLabels, moodOrder, tenseLabels } from "./verbLabels";

const makeId = () => globalThis.crypto?.randomUUID?.() || `learner-${Date.now()}`;
const normalize = (value) =>
  String(value || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const isVerb = (word) => normalize(word?.part) === "verbo" || (word?.tags || []).some((tag) => normalize(tag) === "verbo");
const isInfinitiveVerb = (word) => {
  const value = normalize(word?.word);
  return isVerb(word) && /(?:ar|er|ir)(?:se)?$/.test(value);
};

async function speakSpanish(text) {
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

function getLearnerId() {
  let id = localStorage.getItem("palabraLearnerId");
  if (!id) {
    id = makeId();
    localStorage.setItem("palabraLearnerId", id);
  }
  return id;
}

const navItems = [
  ["lookup", "查詢"],
  ["library", "單字庫"],
  ["quiz", "測驗"],
  ["review", "弱點複習"]
];

function NavIcon({ id, mobile = false }) {
  const size = mobile ? 22 : 20;
  if (id === "lookup") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (id === "library") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4Zm16 0h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  if (id === "quiz") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2M12 17.2v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (id === "review") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 2.3 5.6M4 20v-5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7"/><path d="M5 20c1-3.5 3.5-5.5 7-5.5s6 2 7 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function Onboarding({ onDone }) {
  const [name, setName] = useState("");
  return (
    <main className="react-onboarding">
      <section className="react-onboarding-brand">
        <div className="ibv-brand">
          <div className="ibv-brand-mark">P</div>
          <div className="ibv-brand-text"><h1>Palabra Clara</h1><p>Aprende español</p></div>
        </div>
        <h1>讓每個西班牙文單字，<i>變得清楚。</i></h1>
        <p>查單字、學動詞變位，再用間隔複習把它們留在長期記憶裡。</p>
      </section>
      <form className="react-onboarding-form" onSubmit={(event) => {
        event.preventDefault();
        const displayName = name.trim() || "學習者";
        localStorage.setItem("palabraUserName", displayName);
        localStorage.setItem("palabraOnboarded", "true");
        onDone(displayName);
      }}>
        <p className="ibv-eyebrow">Bienvenido</p>
        <h2 className="ibv-page-h1">開始學習</h2>
        <label className="react-field">你的名字
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="學習者" autoFocus />
        </label>
        <button className="ibv-btn" type="submit">進入 Palabra Clara</button>
      </form>
    </main>
  );
}

function Sidebar({ view, setView, progress, words, name }) {
  const stats = Object.values(progress);
  const mastered = stats.filter((item) => item.mastery === "mastered").length;
  const weak = stats.filter((item) => !item.mastery || item.mastery === "weak").length;
  return (
    <aside className="ibv-aside">
      <div className="ibv-brand">
        <div className="ibv-brand-mark">P</div>
        <div className="ibv-brand-text"><h1>Palabra Clara</h1><p>Aprende español</p></div>
      </div>
      <nav className="ibv-nav">
        {navItems.map(([id, label]) => (
          <button key={id} className={`ibv-tab ${view === id ? "is-active" : ""}`} onClick={() => setView(id)}>
            <span className="ibv-tab-icon"><NavIcon id={id} /></span>{label}
            {id === "lookup" && <span className="ibv-tab-tail">⏎</span>}
            {id === "library" && <span className="ibv-tab-tail">{words.length}</span>}
            {id === "review" && <span className="ibv-tab-tail">{weak}</span>}
          </button>
        ))}
      </nav>
      <div className="ibv-streak">
        <div className="ibv-streak-h"><span>學習進度</span><span>Progreso</span></div>
        <div className="ibv-streak-n"><span>{stats.length}</span><small>個練習單字</small></div>
      </div>
      <div className="ibv-stats">
        <button className="ibv-stat-card" onClick={() => setView("review")}>
          <div><strong>{mastered}</strong><div className="ibv-stat-label">已熟悉</div></div>
          <span className="ibv-stat-icon" style={{ background: "var(--success)" }}>✓</span>
        </button>
        <button className="ibv-stat-card" onClick={() => setView("review")}>
          <div><strong>{weak}</strong><div className="ibv-stat-label">待加強</div></div>
          <span className="ibv-stat-icon" style={{ background: "var(--primary)" }}>!</span>
        </button>
      </div>
      <button className={`ibv-userpill ${view === "account" ? "is-active" : ""}`} onClick={() => setView("account")}>
        <div className="ibv-up-avatar">{name.charAt(0).toUpperCase()}</div>
        <div><div className="ibv-up-name">{name}</div><div className="ibv-up-meta">A1 · 初學</div></div>
      </button>
    </aside>
  );
}

function PageTitle({ eyebrow, children }) {
  return <div className="ibv-page-head"><div><p className="ibv-eyebrow">{eyebrow}</p><h2 className="ibv-page-h1">{children}</h2></div></div>;
}

function MobileHeader({ title }) {
  return <div className="ibv-mob-hdr"><h2 className="ibv-mob-hdr-title">{title}</h2></div>;
}

function Empty({ title, children }) {
  return <div className="ibv-empty-state"><h3 className="ibv-empty-h">{title}</h3><p className="ibv-empty-desc">{children}</p></div>;
}

function WordCard({ word, onSpeak, onRegenerate, loading, headerAction, children }) {
  if (!word) return <Empty title="輸入西班牙文開始查詢">可查詢單字、詞義、發音與例句。</Empty>;
  return (
    <div className="ibv-entry">
      <article className="ibv-headcard">
        <div className="ibv-head-content">
          <div className="ibv-head-meta">
            <span className="ibv-pos">{word.part || "unknown"}</span>
            {word.ipa && <span className="ibv-ipa">{word.ipa}</span>}
            <span className="ibv-level">{word.level || "A1"}</span>
          </div>
          <h2 className="ibv-word">{word.word}</h2>
          <p className="ibv-zh-quick">{word.zh || "尚無翻譯"}</p>
          <p className="ibv-en-quick">{word.en || "No translation"}</p>
        </div>
        <div className="ibv-head-aside">
          <button className="ibv-speak" onClick={() => onSpeak(word.word)} aria-label="播放發音">
            <svg width="22" height="22" viewBox="0 0 24 24"><path d="M5 9v6h4l5 4V5L9 9H5z" fill="currentColor"/><path d="M16.5 8.5c1.6 1.2 2.5 2.4 2.5 3.5s-.9 2.3-2.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none"/></svg>
          </button>
          {headerAction}
          <button className="ibv-icon-btn" onClick={() => onRegenerate(word)} disabled={loading} title="重新生成例句">✦</button>
        </div>
      </article>
      <div className="ibv-grid-two">
        <div className="ibv-meaning">
          <div className="ibv-meaning-h"><span className="ibv-flag" style={{background:"var(--deep)",color:"var(--cream)"}}>中</span><span className="ibv-eyebrow">中文詞義</span></div>
          <p className="ibv-meaning-text">{word.zh || "尚無中文翻譯"}</p>
        </div>
        <div className="ibv-meaning">
          <div className="ibv-meaning-h"><span className="ibv-flag" style={{background:"var(--info)",color:"var(--cream)"}}>EN</span><span className="ibv-eyebrow">English</span></div>
          <p className="ibv-meaning-text">{word.en || "No English translation yet"}</p>
        </div>
      </div>
      {(word.examples || []).length > 0 && <>
        <div className="ibv-section-h"><h3>Ejemplos · 例句</h3><span className="ibv-rule" /><span className="ibv-eyebrow">{word.examples.length} 句</span></div>
        <div className="ibv-examples">{word.examples.map((example, index) => (
          <div className="ibv-ex" key={`${example.es}-${index}`}>
            <span className="ibv-ex-num">EJ {String(index + 1).padStart(2, "0")}</span>
            <p className="ibv-ex-es">{example.es}</p>
            <div className="ibv-ex-trans"><span>{example.zh}</span><span style={{fontStyle:"italic"}}>{example.en}</span></div>
          </div>
        ))}</div>
      </>}
      {children}
    </div>
  );
}

function LookupView({ words, setWords, vocabulary, learnerId, currentWord, setCurrentWord, onVocabularyChanged }) {
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

function buildPersonRows(persons) {
  const rows = [];
  const seen = new Set();
  for (const item of persons || []) {
    const key = `${item.person}:${item.form}`;
    if (!seen.has(key)) rows.push(item);
    seen.add(key);
  }
  return rows;
}

function MoodSection({ mood, tenses, initiallyOpen }) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <section className={`verb-mood verb-mood-${mood}`}>
      <button className="verb-mood-header" onClick={() => setOpen((value) => !value)}>
        <span>{moodLabels[mood] || mood}</span><small>{Object.keys(tenses).length} 個時態 {open ? "−" : "+"}</small>
      </button>
      {open && <div className="verb-tense-grid">
        {Object.entries(tenses).filter(([tense]) => tense !== "pretérito-anterior").map(([tense, persons]) => (
          <details className="verb-tense" key={tense} open={tense === "presente"}>
            <summary><strong>{tenseLabels[tense] || tense}</strong><span>{tense}</span></summary>
            <div className="verb-persons">
              {buildPersonRows(persons).map((item, index) => (
                <div className="verb-person" key={`${item.person}-${index}`}><span>{item.person || "—"}</span><strong>{item.form}</strong></div>
              ))}
            </div>
          </details>
        ))}
      </div>}
    </section>
  );
}

function VerbConjugations({ result }) {
  return <div className="verb-moods">
    {[...moodOrder, ...Object.keys(result.conjugations).filter((mood) => !moodOrder.includes(mood))]
      .filter((mood) => result.conjugations[mood])
      .map((mood, index) => <MoodSection key={mood} mood={mood} tenses={result.conjugations[mood]} initiallyOpen={index === 0} />)}
  </div>;
}

function VerbFormsHover({ word, words, onOpen }) {
  if (!isVerb(word)) return null;
  const lemma = word.lemma || word.canonicalWord || word.word;
  const forms = words.filter((item) =>
    isVerb(item) &&
    normalize(item.lemma || item.canonicalWord || item.word) === normalize(lemma)
  );
  return <div className="library-verb-hover" onClick={(event) => event.stopPropagation()}>
    <div className="library-verb-hover-head">
      <span className="ibv-eyebrow">Formas guardadas</span>
      <strong>{lemma}</strong>
    </div>
    <div className="library-verb-hover-list">
      {forms.map((item) => <button key={item.id} onClick={() => onOpen({ ...item, lookupSurfaceForm: item.word })}>
        <strong>{item.word}</strong>
        <span>{item.person || (normalize(item.word) === normalize(lemma) ? "原形" : "變位")}
          {item.tense ? ` · ${tenseLabels[item.tense] || item.tense}` : ""}
        </span>
      </button>)}
    </div>
  </div>;
}

function LibraryView({ words, onOpen, onSpeak }) {
  const [query, setQuery] = useState("");
  const [section, setSection] = useState("all");
  const [mode, setMode] = useState("cards");
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const filtered = words.filter((word) => {
    if (!normalize(`${word.word} ${word.zh} ${word.en}`).includes(normalize(query))) return false;
    if (section === "general") {
      return !isVerb(word) || isInfinitiveVerb(word);
    }
    if (section === "verbs") return isVerb(word);
    return true;
  }).sort((left, right) => {
    if (section !== "verbs") return 0;
    const leftLemma = left.lemma || left.canonicalWord || left.word;
    const rightLemma = right.lemma || right.canonicalWord || right.word;
    return leftLemma.localeCompare(rightLemma, "es") || left.word.localeCompare(right.word, "es");
  });
  const card = filtered.length ? filtered[cardIndex % filtered.length] : null;
  function moveCard(delta) {
    setCardIndex((value) => (value + delta + filtered.length) % filtered.length);
    setFlipped(false);
  }
  return (
    <section className="view is-active">
      <MobileHeader title={`單字庫 · ${filtered.length} 字`} />
      <div className="ibv-page-head">
        <div><p className="ibv-eyebrow">Vocabulario</p><h2 className="ibv-page-h1">單字庫 <span className="ibv-muted-badge">· {filtered.length} 字</span></h2></div>
        <div className="ibv-segmented" role="group" aria-label="單字庫模式">
          <button className={`ibv-seg ${mode === "cards" ? "is-active" : ""}`} onClick={() => setMode("cards")}>單字卡</button>
          <button className={`ibv-seg ${mode === "list" ? "is-active" : ""}`} onClick={() => setMode("list")}>列表</button>
        </div>
      </div>
      <div className="library-sections" role="group" aria-label="單字庫分類">
        {[["all", "全部"], ["general", "一般單字"], ["verbs", "動詞"]].map(([id, label]) =>
          <button key={id} className={section === id ? "is-active" : ""} onClick={() => { setSection(id); setCardIndex(0); setFlipped(false); }}>{label}</button>)}
      </div>
      <div className="ibv-toolbar"><input value={query} onChange={(event) => { setQuery(event.target.value); setCardIndex(0); }} placeholder="搜尋單字、詞義或詞性" /></div>
      {!card ? <Empty title="查無結果">目前沒有符合條件的單字。</Empty> : mode === "cards" ?
        <div className="ibv-fc-wrap">
          <div className={`ibv-fc ${flipped ? "is-flipped" : ""}`} onClick={() => setFlipped((value) => !value)}>
            <div className="ibv-fc-face ibv-fc-front">
              <div className="ibv-fc-h"><span>Tarjeta {String((cardIndex % filtered.length) + 1).padStart(2, "0")} / {filtered.length}</span><span>{card.level}</span></div>
              <h4 className="ibv-fc-w">{card.word}</h4>
              <div className="ibv-fc-meta"><span className="ibv-pos">{card.part}</span><div className="ibv-card-ipa">{card.ipa}</div></div>
              <button className="ibv-card-speak" onClick={(event) => { event.stopPropagation(); onSpeak(card.word); }} aria-label={`播放 ${card.word} 發音`}>▶ 發音</button>
              <div className="ibv-fc-foot"><span>輕點翻面</span><span>{isVerb(card) && !isInfinitiveVerb(card) ? `原形 · ${card.lemma}` : isVerb(card) ? "動詞 · 可查看變位" : "Palabra Clara"}</span></div>
            </div>
            <div className="ibv-fc-face ibv-fc-back">
              <div className="ibv-fc-h"><span>Significado</span><span>{card.level}</span></div>
              <div className="ibv-fc-meta">
                <p className="ibv-fc-zh">{card.zh}</p>
                <p className="ibv-fc-en">{card.en}</p>
                {isVerb(card) && !isInfinitiveVerb(card) && <div className="ibv-fc-conjugation">
                  <span>原形 <strong>{card.lemma}</strong></span>
                  <span>{moodLabels[card.mood] || card.mood || "動詞變位"} · {tenseLabels[card.tense] || card.tense || "時態未標記"}</span>
                  {card.person && <span>人稱 · {card.person}</span>}
                </div>}
                {card.examples?.[0] && <p className="ibv-fc-ex">“{card.examples[0].es}”</p>}
              </div>
              <div className="ibv-fc-foot"><span>{card.part}</span><span>翻回正面</span></div>
            </div>
          </div>
          <div className="ibv-card-actions">
            <button className="ibv-btn ibv-btn-ghost" onClick={() => moveCard(-1)}>← 上一張</button>
            <button className="ibv-btn ibv-btn-ghost" onClick={() => setFlipped((value) => !value)}>翻面</button>
            <button className="ibv-btn ibv-btn-ghost" onClick={() => onOpen(card)}>查看詞條</button>
            <button className="ibv-btn" onClick={() => moveCard(1)}>下一張 →</button>
          </div>
        </div> :
        <div className="ibv-list">{filtered.map((word) =>
          <div className={`ibv-row ${section === "verbs" ? "has-verb-hover" : ""}`} key={word.id}>
            <button className="ibv-row-open" onClick={() => onOpen(word)}>
              <span className="ibv-row-w">{word.word}</span><span className="ibv-pos">{word.part}</span><span>{word.zh}</span><span>{word.en}</span><span className="ibv-row-ipa">{word.ipa}</span><span>{word.level}</span>
            </button>
            <button className="ibv-row-speak" onClick={() => onSpeak(word.word)} aria-label={`播放 ${word.word} 發音`}>▶</button>
            {section === "verbs" && <VerbFormsHover word={word} words={filtered} onOpen={onOpen} />}
          </div>)}
        </div>}
    </section>
  );
}

function quizEntryWord(entry) {
  const base = entry.word && typeof entry.word === "object" ? entry.word : entry;
  return { ...base, id: entry.id || base.id, wordId: base.id, canonicalWord: base.word, word: entry.surfaceForm || base.word, lemma: entry.lemma || base.word, formKind: entry.formKind || "lemma", mood: entry.mood, tense: entry.tense, person: entry.person };
}

function QuizView({ words, vocabulary, progress, learnerId, onProgress }) {
  const [mode, setMode] = useState("words");
  const [phase, setPhase] = useState("setup");
  const [questionType, setQuestionType] = useState("choice");
  const [includeConjugated, setIncludeConjugated] = useState(false);
  const [unfamiliarOnly, setUnfamiliarOnly] = useState(false);
  const [size, setSize] = useState(8);
  const [selectedTenses, setSelectedTenses] = useState(["indicativo:presente"]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answerValue, setAnswerValue] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const generalEntries = useMemo(
    () => (vocabulary || []).map(quizEntryWord),
    [vocabulary]
  );

  async function buildSession() {
    setLoading(true);
    setFeedback(null);
    setResults([]);
    setIndex(0);
    try {
      if (mode === "words") {
        const pool = buildGeneralPool(generalEntries, { includeConjugated, unfamiliarOnly, progress });
        const selected = shuffle(pool).slice(0, Math.min(size, pool.length));
        const built = selected.map((word) => {
          if (questionType === "blank") {
            const question = buildFillQuestion(word);
            return { ...question, kind: "word", type: "blank", sentence: question.prompt, translation: question.translationHint };
          }
          return { ...buildChoiceQuestion(word, pool), kind: "word", type: "choice" };
        });
        setQuestions(built);
        setPhase(built.length ? "active" : "setup");
        return;
      }

      const infinitives = [...new Set(generalEntries.filter(isVerb).map((entry) => entry.lemma || entry.word))];
      const conjugations = await Promise.all(infinitives.map((verb) => api.conjugate(verb).catch(() => null)));
      const forms = conjugations.filter(Boolean).flatMap((result) => flattenConjugations(result, selectedTenses))
        .filter((target) => !unfamiliarOnly || progress[target.targetWord]?.mastery !== "mastered");
      const built = shuffle(forms).slice(0, Math.min(size, forms.length)).map((target) => ({
        ...buildConjugationChoiceQuestion(target, forms),
        kind: "verb",
        type: "choice",
        word: words.find((item) => normalize(item.word) === normalize(target.infinitive)) || { word: target.infinitive },
        title: `${target.infinitive} · ${tenseLabels[target.tense] || target.tense}`
      }));
      setQuestions(built);
      setPhase(built.length ? "active" : "setup");
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(value) {
    if (feedback) return;
    const question = questions[index];
    let judged;
    if (question.type === "blank") {
      judged = evaluateFillAnswer(value, question);
      if (judged.result === "incorrect" && !judged.accentDifference) {
        judged = await api.judgeAnswer({
          userAnswer: value,
          targetWord: question.answer,
          acceptedAnswers: question.word.acceptedAnswers || question.word.accepted_answers || [],
          nearAnswers: question.word.nearAnswers || question.word.near_answers || [],
          zh: question.word.zh,
          en: question.word.en
        }).catch(() => judged);
      }
    } else {
      judged = value === question.answer
        ? { result: "correct", feedback: "答對了。" }
        : { result: "incorrect", feedback: `正確答案是 ${question.answer}。` };
    }
    setAnswerValue(value);
    setFeedback(judged);
    setResults((items) => [...items, { question, answer: value, result: judged.result }]);
    const saved = await api.recordAttempt({
      learnerId,
      wordId: question.word.id || null,
      targetWord: question.targetWord,
      questionType: question.kind === "verb" ? "verb-conjugation" : `word-${question.type}`,
      userAnswer: value,
      result: judged.result,
      feedback: judged.feedback
    }).catch(() => null);
    onProgress(question.targetWord, saved?.progress);
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setPhase("results");
      return;
    }
    setIndex((value) => value + 1);
    setAnswerValue("");
    setFeedback(null);
  }

  const question = questions[index];
  const correctCount = results.filter((item) => item.result !== "incorrect").length;
  const tenseOptions = [
    ["indicativo:presente", "直說式現在式"],
    ["indicativo:pretérito-perfecto-simple", "簡單過去式"],
    ["indicativo:pretérito-imperfecto", "過去未完成式"],
    ["indicativo:futuro", "未來式"],
    ["condicional:presente", "條件式"],
    ["subjuntivo:presente", "虛擬式現在式"],
    ["imperativo:afirmativo", "肯定命令式"]
  ];

  if (!words.length) return <Empty title="還沒有題目">先查詢幾個單字建立題庫。</Empty>;
  return <section className="view is-active">
    <MobileHeader title="測驗" />
    <div className="ibv-quiz">
      <div className="ibv-page-head">
        <div><p className="ibv-eyebrow">Quiz · 測驗</p><h2 className="ibv-page-h1">{mode === "verbs" ? "動詞變位" : "單字練習"}</h2></div>
        {phase === "setup" && <div className="ibv-segmented">
          <button className={`ibv-seg ${mode === "words" ? "is-active" : ""}`} onClick={() => setMode("words")}>一般單字</button>
          <button className={`ibv-seg ${mode === "verbs" ? "is-active" : ""}`} onClick={() => setMode("verbs")}>動詞變位</button>
        </div>}
      </div>

      {phase === "setup" && <article className="ibv-q-card quiz-setup-card">
        <h3>{mode === "words" ? "設定一般單字測驗" : "設定動詞變位測驗"}</h3>
        {mode === "words" && <div className="quiz-setting">
          <span className="ibv-eyebrow">題型</span>
          <div className="ibv-segmented">
            <button className={`ibv-seg ${questionType === "choice" ? "is-active" : ""}`} onClick={() => setQuestionType("choice")}>選擇題</button>
            <button className={`ibv-seg ${questionType === "blank" ? "is-active" : ""}`} onClick={() => setQuestionType("blank")}>填空題</button>
          </div>
          <label className="ibv-quiz-focus"><input type="checkbox" checked={includeConjugated} onChange={(event) => setIncludeConjugated(event.target.checked)} /><span className="ibv-toggle-vis" /><span>包含已保存的非原形動詞</span></label>
        </div>}
        {mode === "verbs" && <div className="quiz-tense-options">
          {tenseOptions.map(([key, label]) => <label key={key} className="quiz-tense-option">
            <input type="checkbox" checked={selectedTenses.includes(key)} onChange={() => setSelectedTenses((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key])} />
            <span>{label}</span>
          </label>)}
        </div>}
        <div className="quiz-setting quiz-setting-common">
          <label className="ibv-quiz-focus"><input type="checkbox" checked={unfamiliarOnly} onChange={(event) => setUnfamiliarOnly(event.target.checked)} /><span className="ibv-toggle-vis" /><span>只測驗不熟悉內容</span></label>
          <label className="ibv-quiz-size-label">題數<input className="ibv-quiz-size-input" type="number" min="1" max="30" value={size} onChange={(event) => setSize(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
        </div>
        <button className="ibv-btn quiz-start-btn" disabled={loading || (mode === "verbs" && !selectedTenses.length)} onClick={buildSession}>{loading ? "正在建立題目…" : "開始測驗"}</button>
      </article>}

      {phase === "active" && question && <>
        <div className="ibv-quiz-head">
          <div className="ibv-progress-track">{questions.map((_, item) => <span key={item} className={`ibv-prog ${item < index ? "is-done" : item === index ? "is-current" : ""}`} />)}</div>
          <span className="ibv-eyebrow ibv-num">{index + 1} / {questions.length}</span>
        </div>
        <article className="ibv-q-card">
          <div className={`quiz-kind quiz-kind-${question.kind}`}>{question.kind === "verb" ? "動詞變位" : question.type === "blank" ? "單字填空" : "一般單字"}</div>
          {question.type === "blank" ? <>
            <div className="ibv-cloze-card"><p className="ibv-cloze-sentence">{question.sentence}</p><p className="ibv-cloze-meta">{question.translation}</p></div>
            <form className="ibv-blank-form" onSubmit={(event) => { event.preventDefault(); submitAnswer(answerValue); }}>
              <input className="ibv-blank-input" value={answerValue} disabled={Boolean(feedback)} onChange={(event) => setAnswerValue(event.target.value)} placeholder="輸入西班牙文答案" autoFocus />
            </form>
          </> : <>
            <h3 className="ibv-q-prompt">{question.title && <><em>{question.title}</em><br /></>}<span>{question.prompt}</span></h3>
            <div className="ibv-options">{question.choices.map((choice) => <button key={choice} disabled={Boolean(feedback)} onClick={() => submitAnswer(choice)} className={`ibv-option ${feedback ? choice === question.answer ? "is-correct" : answerValue === choice ? "is-wrong" : "" : ""}`}><strong>{choice}</strong><span>{question.kind === "verb" ? question.target.person : "選擇此答案"}</span></button>)}</div>
          </>}
          {feedback && <div className={`ibv-feedback is-${feedback.result}`}>
            <div className="ibv-feedback-lab">{feedback.result === "correct" ? "¡Correcto!" : feedback.result === "acceptable" ? "Respuesta aceptable" : "Vamos a repasar"}</div>
            <div className="ibv-feedback-body">{feedback.feedback}</div>
            <div className="ibv-feedback-actions"><button className="ibv-btn" onClick={nextQuestion}>{index + 1 === questions.length ? "查看結果" : "下一題 →"}</button></div>
          </div>}
        </article>
      </>}

      {phase === "results" && <article className="ibv-q-card quiz-results">
        <p className="ibv-eyebrow">Resultado</p><h3>本輪測驗完成</h3>
        <div className="ibv-results-grid">
          <div className="ibv-result-cell"><div className="ibv-result-big">{correctCount}</div><span>答對</span></div>
          <div className="ibv-result-cell"><div className="ibv-result-big">{questions.length}</div><span>總題數</span></div>
          <div className="ibv-result-cell"><div className="ibv-result-big">{questions.length ? Math.round(correctCount / questions.length * 100) : 0}%</div><span>正確率</span></div>
        </div>
        <div className="quiz-result-actions">
          <button className="ibv-btn" onClick={buildSession}>同設定再測一次</button>
          <button className="ibv-btn ibv-btn-ghost" onClick={() => setPhase("setup")}>重新設定測驗</button>
        </div>
      </article>}
    </div>
  </section>;
}

function ReviewView({ words, progress, onOpen }) {
  const [status, setStatus] = useState("unfamiliar");
  const [kind, setKind] = useState("all");
  const wordBySurface = new Map(words.map((word) => [word.word, word]));
  const items = Object.entries(progress).map(([targetWord, item]) => {
    const word = wordBySurface.get(targetWord);
    const conjugation = !word && targetWord.includes(":");
    const [infinitive, mood, tense, person] = conjugation ? targetWord.split(":") : [];
    return {
      key: targetWord,
      kind: conjugation ? "conjugation" : "word",
      mastery: item.mastery || "weak",
      progress: item,
      word,
      title: word?.word || (conjugation ? `${infinitive} · ${person || "變位"}` : targetWord),
      subtitle: word ? `${word.zh} · ${word.en}` : `${moodLabels[mood] || mood} · ${tenseLabels[tense] || tense}`
    };
  }).filter((item) => {
    if (kind !== "all" && item.kind !== kind) return false;
    if (status === "unfamiliar") return item.mastery !== "mastered";
    if (status !== "all") return item.mastery === status;
    return true;
  });
  return (
    <section className="view is-active">
      <MobileHeader title="弱點複習" />
      <div className="ibv-page-head">
        <div><p className="ibv-eyebrow">Repaso</p><h2 className="ibv-page-h1">弱點複習</h2></div>
        <div className="review-filters">
          <div className="ibv-segmented">{[["unfamiliar", "不熟悉"], ["weak", "待加強"], ["learning", "學習中"], ["mastered", "已熟悉"], ["all", "全部"]].map(([id, label]) => <button key={id} className={`ibv-seg ${status === id ? "is-active" : ""}`} onClick={() => setStatus(id)}>{label}</button>)}</div>
          <div className="ibv-segmented">{[["all", "全部題型"], ["word", "一般單字"], ["conjugation", "動詞變位"]].map(([id, label]) => <button key={id} className={`ibv-seg ${kind === id ? "is-active" : ""}`} onClick={() => setKind(id)}>{label}</button>)}</div>
        </div>
      </div>
      {items.length === 0 ? <Empty title="目前沒有符合條件的項目">完成測驗後，熟悉度會依間隔複習紀錄顯示在這裡。</Empty> :
        <div className="ibv-review-list">{items.map((item) => (
          <button className="ibv-review-card" key={item.key} onClick={() => item.word && onOpen(item.word)} disabled={!item.word}>
            <div><div className="ibv-review-word">{item.title}</div><div className="ibv-review-trans">{item.subtitle}</div></div>
            <div>
              <div className="ibv-rb-bar"><div className={`ibv-rb-fill ${item.mastery === "weak" ? "is-weak" : ""}`} style={{ width: `${Math.min(100, Math.max(12, (item.progress.repetition || 0) / 3 * 100))}%` }} /></div>
              <small>{item.mastery === "weak" ? "待加強" : item.mastery === "learning" ? "學習中" : "已熟悉"}</small>
            </div>
            <div className="ibv-review-action">{item.word ? "查看詞條 →" : "變位學習卡"}</div>
          </button>
        ))}</div>}
    </section>
  );
}

function AccountView({ name, setName, words, progress }) {
  const [draft, setDraft] = useState(name);
  return (
    <section className="view is-active">
      <MobileHeader title="我" />
      <PageTitle eyebrow="Mi cuenta">帳號管理</PageTitle>
      <div className="ibv-acct-card react-account">
        <div className="ibv-profile-head">
          <div className="ibv-avatar-lg">{name.charAt(0).toUpperCase()}</div>
          <div><div className="ibv-profile-name">{name}</div><div className="ibv-profile-email">本機學習者 · PostgreSQL 學習紀錄</div></div>
        </div>
        <div className="ibv-summary-grid">
          <div className="ibv-summary"><div className="ibv-summary-val">{words.length}</div><div className="ibv-summary-lab">單字</div></div>
          <div className="ibv-summary"><div className="ibv-summary-val">{Object.keys(progress).length}</div><div className="ibv-summary-lab">已練習</div></div>
        </div>
        <form className="react-account-form" onSubmit={(event) => {
          event.preventDefault();
          const next = draft.trim() || "學習者";
          localStorage.setItem("palabraUserName", next);
          setName(next);
        }}>
          <label className="react-field">顯示名稱<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
          <button className="ibv-btn">儲存</button>
        </form>
      </div>
    </section>
  );
}

export default function App() {
  const [onboarded, setOnboarded] = useState(Boolean(localStorage.getItem("palabraOnboarded")));
  const [name, setName] = useState(localStorage.getItem("palabraUserName") || "學習者");
  const [view, setView] = useState("lookup");
  const [words, setWords] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [progress, setProgress] = useState(() => JSON.parse(localStorage.getItem("palabraProgress") || "{}"));
  const [loading, setLoading] = useState(true);
  const learnerId = useMemo(getLearnerId, []);

  useEffect(() => {
    if (!onboarded) return;
    Promise.all([api.words(), api.vocabulary(learnerId).catch(() => []), api.progress(learnerId).catch(() => ({}))])
      .then(([loadedWords, entries, remote]) => {
        setWords(loadedWords);
        setVocabulary(entries);
        setCurrentWord(loadedWords[0] || null);
        setProgress((local) => ({ ...local, ...remote }));
      })
      .finally(() => setLoading(false));
  }, [learnerId, onboarded]);

  useEffect(() => localStorage.setItem("palabraProgress", JSON.stringify(progress)), [progress]);

  if (!onboarded) return <Onboarding onDone={(displayName) => { setName(displayName); setOnboarded(true); }} />;

  function openWord(word) {
    setCurrentWord(word);
    setView("lookup");
  }

  function updateProgress(word, remoteProgress) {
    if (!remoteProgress) return;
    const { targetWord, ...item } = remoteProgress;
    setProgress((current) => ({ ...current, [targetWord || word]: item }));
  }

  return (
    <div className="ibv-root">
      <Sidebar view={view} setView={setView} progress={progress} words={vocabulary} name={name} />
      <main className="ibv-main">
        {loading ? <Empty title="正在載入">正在連接單字庫與學習進度。</Empty> : <>
          {view === "lookup" && <LookupView words={words} setWords={setWords} vocabulary={vocabulary} learnerId={learnerId} currentWord={currentWord} setCurrentWord={setCurrentWord} onVocabularyChanged={setVocabulary} />}
          {view === "library" && <LibraryView words={vocabulary.map(quizEntryWord)} onOpen={openWord} onSpeak={speakSpanish} />}
          {view === "quiz" && <QuizView words={words} vocabulary={vocabulary} progress={progress} learnerId={learnerId} onProgress={updateProgress} />}
          {view === "review" && <ReviewView words={vocabulary.map(quizEntryWord)} progress={progress} onOpen={openWord} />}
          {view === "account" && <AccountView name={name} setName={setName} words={vocabulary} progress={progress} />}
        </>}
      </main>
      <nav className="ibv-mobile-tabbar">
        {[...navItems.slice(0, 3), ["account", "帳號"]].map(([id, label]) => (
          <button key={id} className={`ibv-mob-tab ${view === id ? "is-active" : ""}`} onClick={() => setView(id)}>
            <NavIcon id={id} mobile />{label}<span className="ibv-mob-dot" />
          </button>
        ))}
      </nav>
    </div>
  );
}

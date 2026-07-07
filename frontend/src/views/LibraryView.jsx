import { useState } from "react";
import { MobileHeader, Empty } from "../components/primitives";
import { VerbFormsHover } from "../components/verb/VerbFormsHover";
import { isInfinitiveVerb, isVerb, normalize } from "../lib/wordUtils";
import { moodLabels, tenseLabels } from "../verbLabels";

export function LibraryView({ words, onOpen, onSpeak }) {
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

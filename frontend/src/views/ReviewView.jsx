import { useState } from "react";
import { MobileHeader, Empty } from "../components/primitives";
import { moodLabels, tenseLabels } from "../verbLabels";

export function ReviewView({ words, progress, onOpen }) {
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

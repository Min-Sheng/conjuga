import { Empty } from "./primitives";

export function WordCard({ word, onSpeak, onRegenerate, loading, headerAction, children }) {
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
      {(word.senses || []).length > 1 && <>
        <div className="ibv-section-h"><h3>Sentidos · 詞義總覽</h3><span className="ibv-rule" /><span className="ibv-eyebrow">{word.senses.length} 義</span></div>
        <div className="ibv-senses">{word.senses.map((sense, index) => (
          <div className="ibv-sense" key={`${sense.en}-${index}`}>
            <span className="ibv-pos">{sense.part}</span>
            <span className="ibv-sense-zh">{sense.zh || "—"}</span>
            <span className="ibv-sense-en">{sense.en}</span>
          </div>
        ))}</div>
      </>}
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

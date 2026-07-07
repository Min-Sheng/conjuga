import { useState } from "react";
import { moodLabels, tenseLabels } from "../../verbLabels";

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

export function MoodSection({ mood, tenses, initiallyOpen }) {
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

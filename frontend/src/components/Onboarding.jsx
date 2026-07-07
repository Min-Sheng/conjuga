import { useState } from "react";
import { setOnboarded as persistOnboarded, setStoredUserName } from "../lib/learner";

export function Onboarding({ onDone }) {
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
        setStoredUserName(displayName);
        persistOnboarded();
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

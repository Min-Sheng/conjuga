import { useState } from "react";
import { MobileHeader, PageTitle } from "../components/primitives";
import { setStoredUserName } from "../lib/learner";

export function AccountView({ name, setName, words, progress }) {
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
          setStoredUserName(next);
          setName(next);
        }}>
          <label className="react-field">顯示名稱<input value={draft} onChange={(event) => setDraft(event.target.value)} /></label>
          <button className="ibv-btn">儲存</button>
        </form>
      </div>
    </section>
  );
}

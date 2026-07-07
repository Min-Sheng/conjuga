import { NavIcon, navItems } from "./NavIcon";

export function Sidebar({ view, setView, progress, words, name }) {
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

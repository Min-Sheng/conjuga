export function PageTitle({ eyebrow, children }) {
  return <div className="ibv-page-head"><div><p className="ibv-eyebrow">{eyebrow}</p><h2 className="ibv-page-h1">{children}</h2></div></div>;
}

export function MobileHeader({ title }) {
  return <div className="ibv-mob-hdr"><h2 className="ibv-mob-hdr-title">{title}</h2></div>;
}

export function Empty({ title, children }) {
  return <div className="ibv-empty-state"><h3 className="ibv-empty-h">{title}</h3><p className="ibv-empty-desc">{children}</p></div>;
}

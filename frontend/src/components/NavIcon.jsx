export const navItems = [
  ["lookup", "查詢"],
  ["library", "單字庫"],
  ["quiz", "測驗"],
  ["review", "弱點複習"]
];

export function NavIcon({ id, mobile = false }) {
  const size = mobile ? 22 : 20;
  if (id === "lookup") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.7"/><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (id === "library") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 4h6a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4Zm16 0h-6a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>;
  if (id === "quiz") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.9.4-1.5 1-1.5 2.2M12 17.2v.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
  if (id === "review") return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M4 12a8 8 0 1 1 2.3 5.6M4 20v-5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.7"/><path d="M5 20c1-3.5 3.5-5.5 7-5.5s6 2 7 5.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

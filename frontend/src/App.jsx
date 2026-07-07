import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import { navItems, NavIcon } from "./components/NavIcon";
import { Empty } from "./components/primitives";
import { Sidebar } from "./components/Sidebar";
import { Onboarding } from "./components/Onboarding";
import { LookupView } from "./views/LookupView";
import { LibraryView } from "./views/LibraryView";
import { QuizView } from "./views/QuizView";
import { ReviewView } from "./views/ReviewView";
import { AccountView } from "./views/AccountView";
import { speakSpanish } from "./lib/speech";
import {
  getLearnerId,
  getStoredProgress,
  getStoredUserName,
  isOnboarded as isOnboardedStored,
  setStoredProgress
} from "./lib/learner";
import { quizEntryWord } from "./lib/entryAdapters";

export default function App() {
  const [onboarded, setOnboarded] = useState(isOnboardedStored());
  const [name, setName] = useState(getStoredUserName());
  const [view, setView] = useState("lookup");
  const [wordBank, setWordBank] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [progress, setProgress] = useState(getStoredProgress);
  const [loading, setLoading] = useState(true);
  const learnerId = useMemo(getLearnerId, []);
  // Progress competing-write guard (Phase 3c): keys the local session has
  // already updated (e.g. via a quiz attempt) must not be clobbered by a
  // stale remote snapshot arriving from the initial load. Only remote keys
  // NOT in this set are merged in.
  const locallyUpdatedKeysRef = useRef(new Set());

  useEffect(() => {
    if (!onboarded) return;
    Promise.all([api.words(), api.vocabulary(learnerId).catch(() => []), api.progress(learnerId).catch(() => ({}))])
      .then(([loadedWords, entries, remote]) => {
        setWordBank(loadedWords);
        setVocabulary(entries);
        setCurrentWord(loadedWords[0] || null);
        setProgress((local) => {
          const merged = { ...local };
          for (const [key, value] of Object.entries(remote || {})) {
            if (locallyUpdatedKeysRef.current.has(key)) continue;
            merged[key] = value;
          }
          return merged;
        });
      })
      .finally(() => setLoading(false));
  }, [learnerId, onboarded]);

  useEffect(() => setStoredProgress(progress), [progress]);

  if (!onboarded) return <Onboarding onDone={(displayName) => { setName(displayName); setOnboarded(true); }} />;

  function openWord(word) {
    setCurrentWord(word);
    setView("lookup");
  }

  function updateProgress(word, remoteProgress) {
    if (!remoteProgress) return;
    const { targetWord, ...item } = remoteProgress;
    const key = targetWord || word;
    locallyUpdatedKeysRef.current.add(key);
    setProgress((current) => ({ ...current, [key]: item }));
  }

  return (
    <div className="ibv-root">
      <Sidebar view={view} setView={setView} progress={progress} vocabulary={vocabulary} name={name} />
      <main className="ibv-main">
        {loading ? <Empty title="正在載入">正在連接單字庫與學習進度。</Empty> : <>
          {view === "lookup" && <LookupView wordBank={wordBank} setWordBank={setWordBank} vocabulary={vocabulary} learnerId={learnerId} currentWord={currentWord} setCurrentWord={setCurrentWord} onVocabularyChanged={setVocabulary} />}
          {view === "library" && <LibraryView vocabulary={vocabulary.map(quizEntryWord)} onOpen={openWord} onSpeak={speakSpanish} />}
          {view === "quiz" && <QuizView wordBank={wordBank} vocabulary={vocabulary} progress={progress} learnerId={learnerId} onProgress={updateProgress} />}
          {view === "review" && <ReviewView vocabulary={vocabulary.map(quizEntryWord)} progress={progress} onOpen={openWord} />}
          {view === "account" && <AccountView name={name} setName={setName} vocabulary={vocabulary} progress={progress} />}
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

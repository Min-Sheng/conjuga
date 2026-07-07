import { useEffect, useMemo, useState } from "react";
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
  const [words, setWords] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [currentWord, setCurrentWord] = useState(null);
  const [progress, setProgress] = useState(getStoredProgress);
  const [loading, setLoading] = useState(true);
  const learnerId = useMemo(getLearnerId, []);

  useEffect(() => {
    if (!onboarded) return;
    Promise.all([api.words(), api.vocabulary(learnerId).catch(() => []), api.progress(learnerId).catch(() => ({}))])
      .then(([loadedWords, entries, remote]) => {
        setWords(loadedWords);
        setVocabulary(entries);
        setCurrentWord(loadedWords[0] || null);
        setProgress((local) => ({ ...local, ...remote }));
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
    setProgress((current) => ({ ...current, [targetWord || word]: item }));
  }

  return (
    <div className="ibv-root">
      <Sidebar view={view} setView={setView} progress={progress} words={vocabulary} name={name} />
      <main className="ibv-main">
        {loading ? <Empty title="正在載入">正在連接單字庫與學習進度。</Empty> : <>
          {view === "lookup" && <LookupView words={words} setWords={setWords} vocabulary={vocabulary} learnerId={learnerId} currentWord={currentWord} setCurrentWord={setCurrentWord} onVocabularyChanged={setVocabulary} />}
          {view === "library" && <LibraryView words={vocabulary.map(quizEntryWord)} onOpen={openWord} onSpeak={speakSpanish} />}
          {view === "quiz" && <QuizView words={words} vocabulary={vocabulary} progress={progress} learnerId={learnerId} onProgress={updateProgress} />}
          {view === "review" && <ReviewView words={vocabulary.map(quizEntryWord)} progress={progress} onOpen={openWord} />}
          {view === "account" && <AccountView name={name} setName={setName} words={vocabulary} progress={progress} />}
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

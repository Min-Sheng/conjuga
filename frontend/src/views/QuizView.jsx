import { useMemo, useState } from "react";
import { api } from "../api";
import { MobileHeader, Empty } from "../components/primitives";
import { isVerb, normalize } from "../lib/wordUtils";
import { quizEntryWord } from "../lib/entryAdapters";
import { tenseLabels } from "../verbLabels";
import {
  buildVerbQuizSession,
  buildWordQuizSession,
  evaluateFillAnswer
} from "../quizUtils";

export function QuizView({ wordBank, vocabulary, progress, learnerId, onProgress }) {
  const [mode, setMode] = useState("words");
  const [phase, setPhase] = useState("setup");
  const [questionType, setQuestionType] = useState("choice");
  const [includeConjugated, setIncludeConjugated] = useState(false);
  const [unfamiliarOnly, setUnfamiliarOnly] = useState(false);
  const [size, setSize] = useState(8);
  const [selectedTenses, setSelectedTenses] = useState(["indicativo:presente"]);
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [answerValue, setAnswerValue] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [emptyReason, setEmptyReason] = useState("");

  const generalEntries = useMemo(
    () => (vocabulary || []).map(quizEntryWord),
    [vocabulary]
  );

  async function buildSession() {
    setLoading(true);
    setFeedback(null);
    setResults([]);
    setIndex(0);
    setEmptyReason("");
    try {
      if (mode === "words") {
        const { questions: built, poolSize } = buildWordQuizSession(generalEntries, {
          includeConjugated,
          unfamiliarOnly,
          progress,
          questionType,
          size
        });
        setQuestions(built);
        if (built.length) {
          setPhase("active");
        } else {
          setPhase("setup");
          setEmptyReason(
            poolSize === 0
              ? (unfamiliarOnly
                ? "目前收藏的單字都已標記為熟悉，取消「只測驗不熟悉內容」或先收藏更多單字。"
                : "單字庫還沒有可用單字，請先在「查詢」加入幾個單字到收藏。")
              : "題數設定過小或篩選條件過嚴，請調整後再試一次。"
          );
        }
        return;
      }

      const infinitives = [...new Set(generalEntries.filter(isVerb).map((entry) => entry.lemma || entry.word))];
      if (!infinitives.length) {
        setQuestions([]);
        setPhase("setup");
        setEmptyReason("收藏的單字庫中還沒有動詞，請先查詢並收藏一個動詞。");
        return;
      }
      const conjugations = await Promise.all(infinitives.map((verb) => api.conjugate(verb).catch(() => null)));
      const { questions: built, poolSize } = buildVerbQuizSession(conjugations, {
        selectedTenses,
        unfamiliarOnly,
        progress,
        size,
        findWord: (infinitive) => wordBank.find((item) => normalize(item.word) === normalize(infinitive)),
        tenseLabel: (tense) => tenseLabels[tense] || tense
      });
      setQuestions(built);
      if (built.length) {
        setPhase("active");
      } else {
        setPhase("setup");
        setEmptyReason(
          poolSize === 0
            ? "所選時態沒有可用的變位形式，請調整時態或勾選其他選項。"
            : "目前收藏的變位都已標記為熟悉，取消「只測驗不熟悉內容」或先收藏更多變位。"
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function submitAnswer(value) {
    if (feedback) return;
    const question = questions[index];
    let judged;
    if (question.type === "blank") {
      judged = evaluateFillAnswer(value, question);
      if (judged.result === "incorrect" && !judged.accentDifference) {
        judged = await api.judgeAnswer({
          userAnswer: value,
          targetWord: question.answer,
          acceptedAnswers: question.word.acceptedAnswers || [],
          nearAnswers: question.word.nearAnswers || [],
          zh: question.word.zh,
          en: question.word.en
        }).catch(() => judged);
      }
    } else {
      judged = value === question.answer
        ? { result: "correct", feedback: "答對了。" }
        : { result: "incorrect", feedback: `正確答案是 ${question.answer}。` };
    }
    setAnswerValue(value);
    setFeedback(judged);
    setResults((items) => [...items, { question, answer: value, result: judged.result }]);
    const saved = await api.recordAttempt({
      learnerId,
      wordId: question.word.id || null,
      targetWord: question.targetWord,
      questionType: question.kind === "verb" ? "verb-conjugation" : `word-${question.type}`,
      userAnswer: value,
      result: judged.result,
      feedback: judged.feedback
    }).catch(() => null);
    onProgress(question.targetWord, saved?.progress);
  }

  function nextQuestion() {
    if (index + 1 >= questions.length) {
      setPhase("results");
      return;
    }
    setIndex((value) => value + 1);
    setAnswerValue("");
    setFeedback(null);
  }

  const question = questions[index];
  const correctCount = results.filter((item) => item.result !== "incorrect").length;
  const tenseOptions = [
    ["indicativo:presente", "直說式現在式"],
    ["indicativo:pretérito-perfecto-simple", "簡單過去式"],
    ["indicativo:pretérito-imperfecto", "過去未完成式"],
    ["indicativo:futuro", "未來式"],
    ["condicional:presente", "條件式"],
    ["subjuntivo:presente", "虛擬式現在式"],
    ["imperativo:afirmativo", "肯定命令式"]
  ];

  if (!vocabulary.length) return <Empty title="還沒有題目">先查詢幾個單字並加入單字庫建立題庫。</Empty>;
  return <section className="view is-active">
    <MobileHeader title="測驗" />
    <div className="ibv-quiz">
      <div className="ibv-page-head">
        <div><p className="ibv-eyebrow">Quiz · 測驗</p><h2 className="ibv-page-h1">{mode === "verbs" ? "動詞變位" : "單字練習"}</h2></div>
        {phase === "setup" && <div className="ibv-segmented">
          <button className={`ibv-seg ${mode === "words" ? "is-active" : ""}`} onClick={() => setMode("words")}>一般單字</button>
          <button className={`ibv-seg ${mode === "verbs" ? "is-active" : ""}`} onClick={() => setMode("verbs")}>動詞變位</button>
        </div>}
      </div>

      {phase === "setup" && <article className="ibv-q-card quiz-setup-card">
        <h3>{mode === "words" ? "設定一般單字測驗" : "設定動詞變位測驗"}</h3>
        {mode === "words" && <div className="quiz-setting">
          <span className="ibv-eyebrow">題型</span>
          <div className="ibv-segmented">
            <button className={`ibv-seg ${questionType === "choice" ? "is-active" : ""}`} onClick={() => setQuestionType("choice")}>選擇題</button>
            <button className={`ibv-seg ${questionType === "blank" ? "is-active" : ""}`} onClick={() => setQuestionType("blank")}>填空題</button>
          </div>
          <label className="ibv-quiz-focus"><input type="checkbox" checked={includeConjugated} onChange={(event) => setIncludeConjugated(event.target.checked)} /><span className="ibv-toggle-vis" /><span>包含已保存的非原形動詞</span></label>
        </div>}
        {mode === "verbs" && <div className="quiz-tense-options">
          {tenseOptions.map(([key, label]) => <label key={key} className="quiz-tense-option">
            <input type="checkbox" checked={selectedTenses.includes(key)} onChange={() => setSelectedTenses((items) => items.includes(key) ? items.filter((item) => item !== key) : [...items, key])} />
            <span>{label}</span>
          </label>)}
        </div>}
        <div className="quiz-setting quiz-setting-common">
          <label className="ibv-quiz-focus"><input type="checkbox" checked={unfamiliarOnly} onChange={(event) => setUnfamiliarOnly(event.target.checked)} /><span className="ibv-toggle-vis" /><span>只測驗不熟悉內容</span></label>
          <label className="ibv-quiz-size-label">題數<input className="ibv-quiz-size-input" type="number" min="1" max="30" value={size} onChange={(event) => setSize(Math.max(1, Math.min(30, Number(event.target.value) || 1)))} /></label>
        </div>
        {emptyReason && <p className="ibv-quiz-empty-reason" role="alert">{emptyReason}</p>}
        <button className="ibv-btn quiz-start-btn" disabled={loading || (mode === "verbs" && !selectedTenses.length)} onClick={buildSession}>{loading ? "正在建立題目…" : "開始測驗"}</button>
      </article>}

      {phase === "active" && question && <>
        <div className="ibv-quiz-head">
          <div className="ibv-progress-track">{questions.map((_, item) => <span key={item} className={`ibv-prog ${item < index ? "is-done" : item === index ? "is-current" : ""}`} />)}</div>
          <span className="ibv-eyebrow ibv-num">{index + 1} / {questions.length}</span>
        </div>
        <article className="ibv-q-card">
          <div className={`quiz-kind quiz-kind-${question.kind}`}>{question.kind === "verb" ? "動詞變位" : question.type === "blank" ? "單字填空" : "一般單字"}</div>
          {question.type === "blank" ? <>
            <div className="ibv-cloze-card"><p className="ibv-cloze-sentence">{question.sentence}</p><p className="ibv-cloze-meta">{question.translation}</p></div>
            <form className="ibv-blank-form" onSubmit={(event) => { event.preventDefault(); submitAnswer(answerValue); }}>
              <input className="ibv-blank-input" value={answerValue} disabled={Boolean(feedback)} onChange={(event) => setAnswerValue(event.target.value)} placeholder="輸入西班牙文答案" autoFocus />
            </form>
          </> : <>
            <h3 className="ibv-q-prompt">{question.title && <><em>{question.title}</em><br /></>}<span>{question.prompt}</span></h3>
            <div className="ibv-options">{question.choices.map((choice) => <button key={choice} disabled={Boolean(feedback)} onClick={() => submitAnswer(choice)} className={`ibv-option ${feedback ? choice === question.answer ? "is-correct" : answerValue === choice ? "is-wrong" : "" : ""}`}><strong>{choice}</strong><span>{question.kind === "verb" ? question.target.person : "選擇此答案"}</span></button>)}</div>
          </>}
          {feedback && <div className={`ibv-feedback is-${feedback.result}`}>
            <div className="ibv-feedback-lab">{feedback.result === "correct" ? "¡Correcto!" : feedback.result === "acceptable" ? "Respuesta aceptable" : "Vamos a repasar"}</div>
            <div className="ibv-feedback-body">{feedback.feedback}</div>
            <div className="ibv-feedback-actions"><button className="ibv-btn" onClick={nextQuestion}>{index + 1 === questions.length ? "查看結果" : "下一題 →"}</button></div>
          </div>}
        </article>
      </>}

      {phase === "results" && <article className="ibv-q-card quiz-results">
        <p className="ibv-eyebrow">Resultado</p><h3>本輪測驗完成</h3>
        <div className="ibv-results-grid">
          <div className="ibv-result-cell"><div className="ibv-result-big">{correctCount}</div><span>答對</span></div>
          <div className="ibv-result-cell"><div className="ibv-result-big">{questions.length}</div><span>總題數</span></div>
          <div className="ibv-result-cell"><div className="ibv-result-big">{questions.length ? Math.round(correctCount / questions.length * 100) : 0}%</div><span>正確率</span></div>
        </div>
        <div className="quiz-result-actions">
          <button className="ibv-btn" onClick={buildSession}>同設定再測一次</button>
          <button className="ibv-btn ibv-btn-ghost" onClick={() => setPhase("setup")}>重新設定測驗</button>
        </div>
      </article>}
    </div>
  </section>;
}

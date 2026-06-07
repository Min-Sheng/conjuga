const { query } = require("../db/client");

async function ensureLearner(learnerId, displayName = "Learner") {
  if (!learnerId) return null;
  const result = await query(
    `insert into learners (id, display_name)
     values ($1, $2)
     on conflict (id) do update set updated_at = now()
     returning id`,
    [learnerId, displayName]
  );
  return result.rows[0].id;
}

async function recordLookup({ learnerId, wordId, queryText, source }) {
  await ensureLearner(learnerId);
  await query("insert into lookup_history (learner_id, word_id, query, source) values ($1, $2, $3, $4)", [
    learnerId || null,
    wordId || null,
    queryText,
    source || ""
  ]);
  return { saved: true };
}

async function recordQuizAttempt(payload) {
  await ensureLearner(payload.learnerId);
  await query(
    `insert into quiz_attempts
      (learner_id, word_id, target_word, question_type, user_answer, result, score, feedback)
     values ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      payload.learnerId || null,
      payload.wordId || null,
      payload.targetWord,
      payload.questionType,
      payload.userAnswer || "",
      payload.result,
      payload.score ?? (payload.result === "correct" ? 1 : payload.result === "acceptable" ? 0.8 : 0),
      payload.feedback || ""
    ]
  );
  const progress = await updateWordReview(payload);
  return { saved: true, progress };
}

function qualityForResult(result) {
  if (result === "correct") return 5;
  if (result === "acceptable") return 4;
  return 2;
}

function updateEaseFactor(easeFactor, quality) {
  const next =
    Number(easeFactor) +
    (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(1.3, Number(next.toFixed(2)));
}

function nextReviewState(current, result) {
  const quality = qualityForResult(result);
  const easeFactor = updateEaseFactor(current?.ease_factor || 2.5, quality);

  if (quality < 3) {
    return {
      repetition: 0,
      intervalDays: 1,
      easeFactor,
      quality
    };
  }

  const repetition = Number(current?.repetition || 0) + 1;
  let intervalDays = 1;
  if (repetition === 2) intervalDays = 3;
  if (repetition >= 3) intervalDays = Math.max(1, Math.round(Number(current?.interval_days || 3) * easeFactor));

  return { repetition, intervalDays, easeFactor, quality };
}

async function updateWordReview(payload) {
  if (!payload.learnerId || !payload.targetWord) return null;
  const currentResult = await query(
    "select * from word_reviews where learner_id = $1 and target_word = $2",
    [payload.learnerId, payload.targetWord]
  );
  const current = currentResult.rows[0];
  const next = nextReviewState(current, payload.result);

  const updated = await query(
    `insert into word_reviews
      (learner_id, word_id, target_word, repetition, interval_days, ease_factor, due_at, last_quality, last_result, updated_at)
     values ($1, $2, $3, $4, $5, $6, now() + make_interval(days => $9::int), $7, $8, now())
     on conflict (learner_id, target_word) do update set
       word_id = excluded.word_id,
       repetition = excluded.repetition,
       interval_days = excluded.interval_days,
       ease_factor = excluded.ease_factor,
       due_at = excluded.due_at,
       last_quality = excluded.last_quality,
       last_result = excluded.last_result,
       updated_at = now()
     returning *`,
    [
      payload.learnerId,
      payload.wordId || current?.word_id || null,
      payload.targetWord,
      next.repetition,
      next.intervalDays,
      next.easeFactor,
      next.quality,
      payload.result,
      Math.round(next.intervalDays)
    ]
  );
  return getProgressItem(payload.learnerId, payload.targetWord, updated.rows[0]);
}

function masteryStatus(row) {
  if (!row || row.last_result === "incorrect" || Number(row.repetition) === 0) return "weak";
  if (Number(row.repetition) >= 3 && new Date(row.due_at) > new Date()) return "mastered";
  return "learning";
}

function toProgressItem(row) {
  return {
    correct: Number(row.correct || 0),
    wrong: Number(row.wrong || 0),
    lastSeen: row.last_seen || null,
    repetition: Number(row.repetition || 0),
    intervalDays: Number(row.interval_days || 0),
    easeFactor: Number(row.ease_factor || 2.5),
    dueAt: row.due_at || null,
    lastQuality: Number(row.last_quality || 0),
    lastResult: row.last_result || null,
    mastery: masteryStatus(row)
  };
}

async function getProgressItem(learnerId, targetWord, reviewRow = null) {
  const result = await query(
    `select
       count(*) filter (where result in ('correct', 'acceptable'))::int as correct,
       count(*) filter (where result = 'incorrect')::int as wrong,
       max(created_at) as last_seen
     from quiz_attempts
     where learner_id = $1 and target_word = $2`,
    [learnerId, targetWord]
  );
  const review = reviewRow || (
    await query(
      "select * from word_reviews where learner_id = $1 and target_word = $2",
      [learnerId, targetWord]
    )
  ).rows[0];
  return {
    targetWord,
    ...toProgressItem({ ...result.rows[0], ...review })
  };
}

async function getProgress(learnerId) {
  if (!learnerId) return {};
  const result = await query(
    `select
       qa.target_word,
       count(*) filter (where qa.result in ('correct', 'acceptable'))::int as correct,
       count(*) filter (where qa.result = 'incorrect')::int as wrong,
       max(qa.created_at) as last_seen,
       wr.repetition,
       wr.interval_days,
       wr.ease_factor,
       wr.due_at,
       wr.last_quality,
       wr.last_result
     from quiz_attempts qa
     left join word_reviews wr on wr.learner_id = qa.learner_id and wr.target_word = qa.target_word
     where qa.learner_id = $1
     group by qa.target_word, wr.repetition, wr.interval_days, wr.ease_factor, wr.due_at, wr.last_quality, wr.last_result`,
    [learnerId]
  );

  return Object.fromEntries(
    result.rows.map((row) => [
      row.target_word,
      toProgressItem(row)
    ])
  );
}

async function getLookupHistory(learnerId, limit = 30) {
  if (!learnerId) return [];
  const result = await query(
    `select query, source, created_at
     from lookup_history
     where learner_id = $1
     order by created_at desc
     limit $2`,
    [learnerId, limit]
  );
  return result.rows;
}

module.exports = { ensureLearner, getLookupHistory, getProgress, recordLookup, recordQuizAttempt };

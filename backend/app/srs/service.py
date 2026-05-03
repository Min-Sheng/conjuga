import json as _json
from datetime import date, timedelta

def levenshtein(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein(s2, s1)
    if not s2:
        return len(s1)
    prev = list(range(len(s2) + 1))
    for c1 in s1:
        curr = [prev[0] + 1]
        for j, c2 in enumerate(s2):
            curr.append(min(prev[j] + (0 if c1 == c2 else 1), prev[j+1] + 1, curr[j] + 1))
        prev = curr
    return prev[-1]

def quality_from_answer(question_type: str, is_correct: bool, user_answer: str, correct_form: str) -> int:
    if not is_correct:
        return 1 if question_type == "multiple_choice" else 2
    if question_type == "fill_in":
        if levenshtein(user_answer.lower().strip(), correct_form.lower().strip()) == 1:
            return 3
        return 5
    return 4

def sm2_update(card: dict, quality: int) -> dict:
    repetitions = card["repetitions"]
    interval = card["interval_days"]
    ease = card["ease_factor"]
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = round(interval * ease)
        repetitions += 1
    ease = max(1.3, ease + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    due_date = (date.today() + timedelta(days=interval)).isoformat()
    return {"repetitions": repetitions, "interval_days": interval, "ease_factor": ease, "due_date": due_date}

def get_due_cards(
    user_id: int,
    db,
    limit: int = 20,
    mood_tenses: list = None,
    per_tense: int = None,
    verb_infinitives: list = None,
) -> list:
    """Fetch due cards.

    If per_tense is set, return at most per_tense cards per (verb, mood, tense) group,
    prioritising struggling cards within each group.

    Also appends distractor_only=True sibling cards for every (verb, mood, tense) group
    that appears in the due results so the frontend always has enough choices for MC questions.

    en_senses is batch-fetched from dictionary_cache and attached to every card.
    """
    base = """SELECT id, user_id, verb_infinitive, mood, tense, person, correct_form,
                     repetitions, ease_factor, interval_days, due_date
              FROM srs_cards WHERE user_id = ? AND due_date <= DATE('now')"""
    params = [user_id]

    if mood_tenses:
        clauses = []
        for mt in mood_tenses:
            if ":" in mt:
                m, t = mt.split(":", 1)
                clauses.append("(mood = ? AND tense = ?)")
                params += [m, t]
        if clauses:
            base += " AND (" + " OR ".join(clauses) + ")"

    if verb_infinitives:
        placeholders = ','.join('?' * len(verb_infinitives))
        base += f" AND verb_infinitive IN ({placeholders})"
        params.extend(verb_infinitives)

    # Sort by correct_rate ASC (NULL = new cards, come first in SQLite).
    # Within same rate, oldest due_date first.
    base = f"""
        SELECT sc.id, sc.user_id, sc.verb_infinitive, sc.mood, sc.tense, sc.person,
               sc.correct_form, sc.repetitions, sc.ease_factor, sc.interval_days, sc.due_date,
               CAST(SUM(ql.is_correct) AS REAL) / NULLIF(COUNT(ql.id), 0) AS _correct_rate
        FROM ({base}) sc
        LEFT JOIN quiz_log ql ON ql.card_id = sc.id AND ql.user_id = sc.user_id
        GROUP BY sc.id
        ORDER BY _correct_rate ASC, sc.due_date ASC
        LIMIT ?
    """
    params.append(limit * 10 if per_tense else limit)
    rows = db.execute(base, params).fetchall()
    all_cards = [dict(r) for r in rows]

    if per_tense:
        counts: dict = {}
        result = []
        for card in all_cards:
            key = (card['verb_infinitive'], card['mood'], card['tense'])
            counts[key] = counts.get(key, 0)
            if counts[key] < per_tense:
                result.append(card)
                counts[key] += 1
            if len(result) >= limit:
                break
        all_cards = result
    else:
        all_cards = all_cards[:limit]

    # ── Batch-fetch en_senses ────────────────────────────────────────────────
    unique_verbs = list({c['verb_infinitive'] for c in all_cards})
    en_senses_map: dict = {}
    for verb in unique_verbs:
        row = db.execute(
            "SELECT en_senses FROM dictionary_cache WHERE word = ?", (verb,)
        ).fetchone()
        if row:
            try:
                en_senses_map[verb] = _json.loads(row['en_senses'])[:3]
            except Exception:
                en_senses_map[verb] = []
        else:
            en_senses_map[verb] = []

    # Mark all due cards and attach senses
    due_ids: set = set()
    for c in all_cards:
        c['distractor_only'] = False
        c['en_senses'] = en_senses_map.get(c['verb_infinitive'], [])
        due_ids.add(c['id'])

    # ── Fetch sibling cards for distractor purposes ──────────────────────────
    unique_groups = {(c['verb_infinitive'], c['mood'], c['tense']) for c in all_cards}
    distractor_cards = []

    for verb, mood, tense in unique_groups:
        if due_ids:
            ph = ','.join('?' * len(due_ids))
            sibling_rows = db.execute(
                f"""SELECT id, user_id, verb_infinitive, mood, tense, person, correct_form,
                           repetitions, ease_factor, interval_days, due_date
                    FROM srs_cards
                    WHERE user_id = ? AND verb_infinitive = ? AND mood = ? AND tense = ?
                      AND id NOT IN ({ph})""",
                [user_id, verb, mood, tense] + list(due_ids),
            ).fetchall()
        else:
            sibling_rows = db.execute(
                """SELECT id, user_id, verb_infinitive, mood, tense, person, correct_form,
                          repetitions, ease_factor, interval_days, due_date
                   FROM srs_cards
                   WHERE user_id = ? AND verb_infinitive = ? AND mood = ? AND tense = ?""",
                [user_id, verb, mood, tense],
            ).fetchall()

        for row in sibling_rows:
            card = dict(row)
            card['distractor_only'] = True
            card['en_senses'] = en_senses_map.get(verb, [])
            distractor_cards.append(card)

    return all_cards + distractor_cards


def process_answer(user_id: int, card_id: int, question_type: str, user_answer: str, db) -> dict:
    from fastapi import HTTPException
    card = db.execute("SELECT * FROM srs_cards WHERE id = ? AND user_id = ?", (card_id, user_id)).fetchone()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    card = dict(card)
    correct_form = card["correct_form"]
    is_correct = user_answer.lower().strip() == correct_form.lower().strip()
    quality = quality_from_answer(question_type, is_correct, user_answer, correct_form)
    updated = sm2_update(card, quality)
    db.execute(
        """UPDATE srs_cards SET repetitions=?, interval_days=?, ease_factor=?,
           due_date=?, last_reviewed=CURRENT_TIMESTAMP WHERE id=?""",
        (updated["repetitions"], updated["interval_days"], updated["ease_factor"], updated["due_date"], card_id)
    )
    db.execute(
        "INSERT INTO quiz_log (card_id, user_id, question_type, user_answer, is_correct, quality) VALUES (?,?,?,?,?,?)",
        (card_id, user_id, question_type, user_answer, is_correct, quality)
    )
    db.commit()
    return {"is_correct": is_correct, "quality": quality, "correct_form": correct_form, "next_due": updated["due_date"]}

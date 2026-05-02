from datetime import date, timedelta
import random

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

def generate_distractors(card: dict, db) -> list:
    correct = card["correct_form"]
    rows = db.execute(
        """SELECT correct_form FROM srs_cards
           WHERE user_id = ? AND verb_infinitive = ? AND mood = ? AND tense = ? AND correct_form != ?
           LIMIT 5""",
        (card["user_id"], card["verb_infinitive"], card["mood"], card["tense"], correct)
    ).fetchall()
    distractors = [r["correct_form"] for r in rows]
    if len(distractors) < 3:
        rows2 = db.execute(
            """SELECT correct_form FROM srs_cards
               WHERE user_id = ? AND verb_infinitive = ? AND person = ? AND correct_form != ?
               LIMIT 5""",
            (card["user_id"], card["verb_infinitive"], card["person"], correct)
        ).fetchall()
        for r in rows2:
            if r["correct_form"] not in distractors:
                distractors.append(r["correct_form"])
    random.shuffle(distractors)
    return distractors[:3]

def get_due_cards(user_id: int, db, limit: int = 20, mood_tenses: list = None) -> list:
    base = """SELECT id, user_id, verb_infinitive, mood, tense, person, correct_form,
                     repetitions, ease_factor, interval_days, due_date
              FROM srs_cards WHERE user_id = ? AND due_date <= DATE('now')"""
    params = [user_id]

    if mood_tenses:
        # mood_tenses is a list of "mood:tense" strings
        clauses = []
        for mt in mood_tenses:
            if ":" in mt:
                m, t = mt.split(":", 1)
                clauses.append("(mood = ? AND tense = ?)")
                params += [m, t]
        if clauses:
            base += " AND (" + " OR ".join(clauses) + ")"

    base += " ORDER BY due_date ASC LIMIT ?"
    params.append(limit)
    rows = db.execute(base, params).fetchall()
    return [dict(r) for r in rows]

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

from app.verbs.service import get_conjugations

DEFAULT_TENSES = [
    ("indicativo", "presente"),
    ("indicativo", "pretérito-perfecto-simple"),
    ("indicativo", "pretérito-imperfecto"),
    ("indicativo", "futuro"),
    ("condicional", "presente"),
    ("subjuntivo", "presente"),
    ("imperativo", "afirmativo"),
]

def add_verb(user_id: int, infinitive: str, db) -> dict:
    db.execute(
        """INSERT INTO user_vocabulary (user_id, verb_infinitive) VALUES (?, ?)
           ON CONFLICT(user_id, verb_infinitive) DO UPDATE SET look_up_count = look_up_count + 1""",
        (user_id, infinitive)
    )
    try:
        conjugations = get_conjugations(infinitive)
    except Exception:
        db.commit()
        return {"added": True, "cards_created": 0}

    cards_created = 0
    for mood, tense in DEFAULT_TENSES:
        if mood not in conjugations or tense not in conjugations[mood]:
            continue
        for person_form in conjugations[mood][tense]:
            person = person_form["person"]
            form = person_form["form"]
            if not person or not form:
                continue
            try:
                db.execute(
                    """INSERT OR IGNORE INTO srs_cards
                       (user_id, verb_infinitive, mood, tense, person, correct_form)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (user_id, infinitive, mood, tense, person, form)
                )
                cards_created += db.execute("SELECT changes()").fetchone()[0]
            except Exception:
                continue
    db.commit()
    return {"added": True, "cards_created": cards_created}

def remove_verb(user_id: int, infinitive: str, db):
    db.execute("DELETE FROM user_vocabulary WHERE user_id = ? AND verb_infinitive = ?", (user_id, infinitive))
    db.execute("DELETE FROM srs_cards WHERE user_id = ? AND verb_infinitive = ?", (user_id, infinitive))
    db.commit()

def _tense_status(ease: float, reps: int) -> str:
    if reps == 0:
        return 'new'
    if ease < 2.0:
        return 'struggling'
    if reps >= 3 and ease >= 2.3:
        return 'mastered'
    return 'learning'

def list_verbs(user_id: int, db) -> list:
    rows = db.execute(
        """SELECT v.verb_infinitive, v.added_at, v.look_up_count,
                  COUNT(c.id) as card_count,
                  SUM(CASE WHEN c.due_date <= DATE('now') THEN 1 ELSE 0 END) as due_count
           FROM user_vocabulary v
           LEFT JOIN srs_cards c ON c.user_id = v.user_id AND c.verb_infinitive = v.verb_infinitive
           WHERE v.user_id = ?
           GROUP BY v.verb_infinitive ORDER BY v.added_at DESC""",
        (user_id,)
    ).fetchall()

    verbs = [dict(r) for r in rows]

    # Attach per-tense mastery for each verb
    for verb in verbs:
        tense_rows = db.execute(
            """SELECT mood, tense,
                      ROUND(AVG(ease_factor), 2) as ease,
                      MAX(repetitions) as reps,
                      SUM(CASE WHEN due_date <= DATE('now') THEN 1 ELSE 0 END) as due
               FROM srs_cards
               WHERE user_id = ? AND verb_infinitive = ?
               GROUP BY mood, tense""",
            (user_id, verb['verb_infinitive'])
        ).fetchall()

        # Index by (mood, tense) for O(1) lookup
        card_map = {(r['mood'], r['tense']): r for r in tense_rows}

        tense_mastery = []
        for mood, tense in DEFAULT_TENSES:
            r = card_map.get((mood, tense))
            if r:
                tense_mastery.append({
                    'mood': mood,
                    'tense': tense,
                    'status': _tense_status(r['ease'], r['reps']),
                    'ease_factor': r['ease'],
                    'repetitions': r['reps'],
                    'due': r['due'],
                })
            else:
                tense_mastery.append({'mood': mood, 'tense': tense, 'status': 'new', 'ease_factor': 2.5, 'repetitions': 0, 'due': 0})

        verb['tense_mastery'] = tense_mastery

    return verbs

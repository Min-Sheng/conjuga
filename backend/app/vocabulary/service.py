from app.verbs.service import get_conjugations

DEFAULT_TENSES = [
    # 直說式
    ("indicativo", "presente"),
    ("indicativo", "pretérito-perfecto-simple"),
    ("indicativo", "pretérito-imperfecto"),
    ("indicativo", "pretérito-perfecto-compuesto"),
    ("indicativo", "pretérito-pluscuamperfecto"),
    ("indicativo", "futuro"),
    ("indicativo", "futuro-perfecto"),
    # 條件式
    ("condicional", "presente"),
    ("condicional", "perfecto"),
    # 虛擬式
    ("subjuntivo", "presente"),
    ("subjuntivo", "pretérito-imperfecto-1"),
    ("subjuntivo", "pretérito-imperfecto-2"),
    ("subjuntivo", "pretérito-perfecto"),
    ("subjuntivo", "pretérito-pluscuamperfecto-1"),
    ("subjuntivo", "pretérito-pluscuamperfecto-2"),
    ("subjuntivo", "futuro"),
    ("subjuntivo", "futuro-perfecto"),
    # 命令式
    ("imperativo", "afirmativo"),
    ("imperativo", "negativo"),
    # 不定式
    ("infinitivo", "infinitivo"),
    # 非人稱
    ("gerundio", "gerundio"),
    ("participo", "participo"),
]

# ── Mastery thresholds ────────────────────────────────────────────────────────
MASTERY_RATE      = 0.80   # correct_rate >= this → mastered (per person)
MASTERY_MIN_REPS  = 5      # minimum attempts per person to qualify as mastered
STRUGGLING_RATE   = 0.40   # correct_rate <  this → struggling (per person)


def _person_status(total: int, correct: int) -> str:
    if total == 0:
        return 'new'
    rate = correct / total
    if rate >= MASTERY_RATE and total >= MASTERY_MIN_REPS:
        return 'mastered'
    if rate < STRUGGLING_RATE:
        return 'struggling'
    return 'learning'


def _tense_status(person_statuses: list) -> str:
    """Aggregate individual person statuses into one tense-level status.

    A tense is mastered only when ALL persons are mastered.
    A tense is struggling when ANY person is struggling.
    """
    if not person_statuses or all(s == 'new' for s in person_statuses):
        return 'new'
    if any(s == 'struggling' for s in person_statuses):
        return 'struggling'
    if all(s == 'mastered' for s in person_statuses):
        return 'mastered'
    return 'learning'


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
            if not form:
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

    for verb in verbs:
        # Per-person correct-rate from quiz_log
        person_rows = db.execute(
            """SELECT sc.mood, sc.tense, sc.person,
                      COUNT(ql.id)                                         AS total_answers,
                      SUM(CASE WHEN ql.is_correct THEN 1 ELSE 0 END)      AS correct_answers
               FROM srs_cards sc
               LEFT JOIN quiz_log ql ON ql.card_id = sc.id AND ql.user_id = ?
               WHERE sc.user_id = ? AND sc.verb_infinitive = ?
               GROUP BY sc.mood, sc.tense, sc.person""",
            (user_id, user_id, verb['verb_infinitive'])
        ).fetchall()

        # Index person data by (mood, tense)
        tense_map: dict = {}
        for r in person_rows:
            key = (r['mood'], r['tense'])
            if key not in tense_map:
                tense_map[key] = {'person_statuses': [], 'total': 0, 'correct': 0}
            tense_map[key]['person_statuses'].append(
                _person_status(r['total_answers'], r['correct_answers'])
            )
            tense_map[key]['total']   += r['total_answers']
            tense_map[key]['correct'] += r['correct_answers']

        tense_mastery = []
        for mood, tense in DEFAULT_TENSES:
            key = (mood, tense)
            if key in tense_map:
                d = tense_map[key]
                total   = d['total']
                correct = d['correct']
                status  = _tense_status(d['person_statuses'])
                correct_rate = round(correct / total, 3) if total > 0 else None
                tense_mastery.append({
                    'mood': mood, 'tense': tense,
                    'status': status,
                    'correct_rate': correct_rate,
                    'total_answers': total,
                })
            else:
                tense_mastery.append({
                    'mood': mood, 'tense': tense,
                    'status': 'new',
                    'correct_rate': None,
                    'total_answers': 0,
                })

        verb['tense_mastery'] = tense_mastery

    return verbs

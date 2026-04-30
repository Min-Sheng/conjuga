from fastapi import APIRouter, Depends, HTTPException, Query, Request
from app.database import get_db_dep
from app.auth.service import get_current_user
from app.verbs import lookup_index, service
from app.verbs.schemas import VerbLookupOut, PersonForm
from typing import Optional

router = APIRouter(prefix="/verbs", tags=["verbs"])

@router.get("/lookup", response_model=VerbLookupOut)
async def lookup_verb(
    q: str = Query(..., description="Any Spanish verb form or infinitive"),
    request: Request = None,
    db=Depends(get_db_dep),
):
    q = q.strip().lower()

    # Try direct infinitive lookup first, then reverse lookup
    infinitives = lookup_index.lookup(q)
    if not infinitives:
        # Maybe the input IS an infinitive
        from verbecc import CompleteConjugator
        conj = CompleteConjugator(lang='es')
        try:
            conj.conjugate(q)  # will raise if not found
            infinitives = [q]
        except Exception:
            raise HTTPException(status_code=404, detail=f"Verb form '{q}' not found")

    infinitive = infinitives[0]

    # Get conjugations and meaning
    try:
        conjugations_raw = service.get_conjugations(infinitive)
    except Exception:
        raise HTTPException(status_code=500, detail="Error conjugating verb")

    # Convert to PersonForm objects
    conjugations = {}
    for mood, tenses in conjugations_raw.items():
        conjugations[mood] = {}
        for tense, persons in tenses.items():
            conjugations[mood][tense] = [PersonForm(**p) for p in persons]

    en_senses = service.get_meaning(infinitive, db)

    # Auto-save to user vocabulary if authenticated
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from app.auth.service import decode_token
            user_id = decode_token(token)
            db.execute(
                """INSERT INTO user_vocabulary (user_id, verb_infinitive) VALUES (?, ?)
                   ON CONFLICT(user_id, verb_infinitive) DO UPDATE SET look_up_count = look_up_count + 1""",
                (user_id, infinitive)
            )
            db.commit()
    except Exception:
        pass  # don't fail the lookup if auto-save fails

    return VerbLookupOut(
        input_form=q,
        infinitive=infinitive,
        en_senses=en_senses,
        conjugations=conjugations,
    )

from fastapi import APIRouter, Depends, Query
from app.database import get_db_dep
from app.auth.service import get_current_user
from app.srs import service
from app.srs.schemas import CardOut, AnswerIn, AnswerOut

router = APIRouter(prefix="/quiz", tags=["quiz"])

@router.get("/due", response_model=list[CardOut])
async def get_due_cards(
    limit: int = Query(default=200, ge=1, le=500),
    filter: str = Query(default="", description="Comma-separated mood:tense pairs"),
    per_tense: int = Query(default=None, ge=1, le=20, description="Max cards per verb×tense group"),
    verbs: str = Query(default="", description="Comma-separated verb infinitives to include"),
    user=Depends(get_current_user),
    db=Depends(get_db_dep),
):
    mood_tenses = [f.strip() for f in filter.split(",") if f.strip()] if filter else None
    verb_list = [v.strip() for v in verbs.split(",") if v.strip()] if verbs else None
    return service.get_due_cards(user["id"], db, limit, mood_tenses, per_tense, verb_list)

@router.post("/answer", response_model=AnswerOut)
async def submit_answer(body: AnswerIn, user=Depends(get_current_user), db=Depends(get_db_dep)):
    return service.process_answer(user["id"], body.card_id, body.question_type, body.user_answer, db)

@router.get("/stats")
async def get_stats(user=Depends(get_current_user), db=Depends(get_db_dep)):
    total = db.execute("SELECT COUNT(*) as n FROM srs_cards WHERE user_id = ?", (user["id"],)).fetchone()["n"]
    due = db.execute("SELECT COUNT(*) as n FROM srs_cards WHERE user_id = ? AND due_date <= DATE('now')", (user["id"],)).fetchone()["n"]
    streak = db.execute(
        """SELECT COUNT(*) as streak FROM (
             SELECT day, rn FROM (
               SELECT DATE(reviewed_at) as day,
                      ROW_NUMBER() OVER (ORDER BY DATE(reviewed_at) DESC) as rn
               FROM quiz_log WHERE user_id = ?
               GROUP BY DATE(reviewed_at)
             )
             WHERE julianday(DATE('now')) - julianday(day) = rn - 1
           )""",
        (user["id"],)
    ).fetchone()["streak"]
    return {"total_cards": total, "due_today": due, "streak": streak}

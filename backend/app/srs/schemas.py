from pydantic import BaseModel

class CardOut(BaseModel):
    id: int
    verb_infinitive: str
    mood: str
    tense: str
    person: str
    correct_form: str
    repetitions: int
    ease_factor: float
    interval_days: int
    due_date: str

class AnswerIn(BaseModel):
    card_id: int
    question_type: str  # "multiple_choice" or "fill_in"
    user_answer: str

class AnswerOut(BaseModel):
    is_correct: bool
    quality: int
    correct_form: str
    next_due: str

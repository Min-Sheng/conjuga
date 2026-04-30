from pydantic import BaseModel
from typing import Any

class PersonForm(BaseModel):
    person: str
    form: str

class VerbLookupOut(BaseModel):
    input_form: str
    infinitive: str
    en_senses: list[str]
    conjugations: dict[str, dict[str, list[PersonForm]]]
    # Structure: { mood: { tense: [ {person, form} ] } }

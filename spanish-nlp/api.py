import json
import logging
from functools import lru_cache

import simplemma
from fastapi import FastAPI, HTTPException, Query
from verbecc import CompleteConjugator

logger = logging.getLogger("palabra_clara_nlp")

app = FastAPI(title="Palabra Clara NLP", version="0.1.0")


@lru_cache(maxsize=1)
def get_conjugator() -> CompleteConjugator:
    return CompleteConjugator(lang="es")


def resolve_infinitive(form: str) -> str:
    candidate = simplemma.lemmatize(form.strip().lower(), lang="es")
    if candidate.endswith(("ar", "er", "ir")):
        return candidate
    if form.endswith(("ar", "er", "ir")):
        return form
    return candidate


def conjugate(infinitive: str) -> dict:
    raw = json.loads(get_conjugator().conjugate(infinitive).to_json())
    result: dict[str, dict[str, list[dict[str, str]]]] = {}

    for mood, tenses in raw.get("moods", {}).items():
        mood_result = {}
        for tense, forms in tenses.items():
            if not isinstance(forms, list):
                continue
            persons = []
            for item in forms:
                if not isinstance(item, dict) or not item.get("c"):
                    continue
                form_text = item["c"][0].strip()
                pronoun = item.get("pr", "")
                if pronoun and form_text.startswith(f"{pronoun} "):
                    form_text = form_text[len(pronoun) + 1:]
                persons.append({"person": pronoun, "form": form_text})
            if persons:
                mood_result[tense] = persons
        if mood_result:
            result[mood] = mood_result
    return result


def find_form_matches(input_form: str, conjugations: dict) -> list[dict[str, str]]:
    matches = []
    for mood, tenses in conjugations.items():
        for tense, persons in tenses.items():
            for item in persons:
                if item.get("form", "").lower() == input_form:
                    matches.append({
                        "mood": mood,
                        "tense": tense,
                        "person": item.get("person", ""),
                        "form": item["form"],
                    })
    return matches


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/verbs/lookup")
def lookup_verb(q: str = Query(..., min_length=1, max_length=64)) -> dict:
    input_form = q.strip().lower()
    infinitive = resolve_infinitive(input_form)
    try:
        conjugations = conjugate(infinitive)
    except Exception as error:
        logger.exception("Failed to conjugate infinitive %r (input %r)", infinitive, input_form)
        raise HTTPException(status_code=404, detail=f"找不到動詞「{input_form}」") from error

    if not conjugations:
        raise HTTPException(status_code=404, detail=f"找不到動詞「{input_form}」")

    return {
        "inputForm": input_form,
        "infinitive": infinitive,
        "formKind": "lemma" if input_form == infinitive else "conjugated",
        "matches": find_form_matches(input_form, conjugations),
        "conjugations": conjugations,
    }

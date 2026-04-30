from verbecc import CompleteConjugator
import json
import httpx
import ssl
import logging
from contextlib import contextmanager

logger = logging.getLogger(__name__)
_conjugator = None

def get_conjugator():
    global _conjugator
    if _conjugator is None:
        _conjugator = CompleteConjugator(lang='es')
    return _conjugator

def get_conjugations(infinitive: str) -> dict:
    """Return conjugations as { mood: { tense: [{person, form}] } }"""
    conj = get_conjugator()
    conj_obj = conj.conjugate(infinitive)
    conj_dict = json.loads(conj_obj.to_json())
    moods = conj_dict.get('moods', {})

    result = {}
    for mood, tenses in moods.items():
        result[mood] = {}
        for tense, forms_list in tenses.items():
            if not isinstance(forms_list, list):
                continue
            persons = []
            for form_obj in forms_list:
                if not isinstance(form_obj, dict):
                    continue
                pronoun = form_obj.get('pr', '')
                forms = form_obj.get('c', [])
                if forms:
                    # Take first form, strip pronoun prefix if present
                    form_str = forms[0]
                    parts = form_str.strip().split()
                    # Pronoun is included in form_str, just use pronoun from 'pr' key
                    persons.append({"person": pronoun, "form": parts[-1] if len(parts) > 1 else form_str})
            if persons:
                result[mood][tense] = persons
    return result

def get_meaning(infinitive: str, db) -> list[str]:
    """Fetch English meanings from kaikki.org. Caches in dictionary_cache table."""
    # Check cache first
    row = db.execute(
        "SELECT en_senses FROM dictionary_cache WHERE word = ?", (infinitive,)
    ).fetchone()
    if row:
        import json as json_mod
        return json_mod.loads(row["en_senses"])

    # Fetch from kaikki.org
    try:
        w = infinitive.lower()
        url = f"https://kaikki.org/dictionary/Spanish/meaning/{w[0]}/{w[:2]}/{w}.jsonl"
        ssl_ctx = ssl.create_default_context()
        ssl_ctx.check_hostname = False
        ssl_ctx.verify_mode = ssl.CERT_NONE

        import urllib.request
        raw = urllib.request.urlopen(url, timeout=10, context=ssl_ctx).read().decode("utf-8")

        senses = []
        for line in raw.splitlines():
            if not line.strip():
                continue
            entry = json.loads(line)
            if entry.get("pos") != "verb":
                continue
            for sense in entry.get("senses", []):
                for gloss in sense.get("glosses", []):
                    if gloss and gloss not in senses:
                        senses.append(gloss)

        # Cache result
        import json as json_mod
        db.execute(
            "INSERT OR REPLACE INTO dictionary_cache (word, en_senses) VALUES (?, ?)",
            (infinitive, json_mod.dumps(senses, ensure_ascii=False))
        )
        db.commit()
        return senses

    except Exception as e:
        logger.warning(f"Could not fetch meaning for {infinitive}: {e}")
        return []

from verbecc import CompleteConjugator
import json
import logging

logger = logging.getLogger(__name__)

_INDEX: dict[str, list[str]] = {}  # module-level cache

def build_index() -> dict[str, list[str]]:
    """Build {conjugated_form -> [infinitives]} index from all verbecc verbs.
    Takes ~30-60s on first call. Result stored in module-level _INDEX."""
    global _INDEX
    if _INDEX:
        return _INDEX

    logger.info("Building verb lookup index (this takes ~30-60s)...")
    conj = CompleteConjugator(lang='es')
    infinitives = conj.get_infinitives()
    index: dict[str, list[str]] = {}

    for inf in infinitives:
        try:
            conj_obj = conj.conjugate(inf)
            conj_dict = json.loads(conj_obj.to_json())
            moods = conj_dict.get('moods', {})
            for mood, tenses in moods.items():
                for tense, forms_list in tenses.items():
                    if not isinstance(forms_list, list):
                        continue
                    for form_obj in forms_list:
                        if not isinstance(form_obj, dict) or 'c' not in form_obj:
                            continue
                        for form_str in form_obj['c']:
                            # form_str is like "yo hablo" or "hablo" — extract the verb
                            parts = form_str.strip().split()
                            word = parts[-1].lower()  # last word is the verb form
                            if word not in index:
                                index[word] = []
                            if inf not in index[word]:
                                index[word].append(inf)
        except Exception:
            continue

    _INDEX = index
    logger.info(f"Index built: {len(index)} unique forms from {len(infinitives)} infinitives")
    return _INDEX

def lookup(form: str) -> list[str]:
    """Return list of infinitives that conjugate to this form. Empty list if not found."""
    idx = _INDEX if _INDEX else build_index()
    return idx.get(form.lower().strip(), [])

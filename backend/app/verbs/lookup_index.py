import simplemma

def lookup(form: str) -> list[str]:
    """Return the infinitive for a conjugated Spanish verb form using simplemma."""
    form = form.lower().strip()
    lemma = simplemma.lemmatize(form, lang='es')
    if lemma.endswith(('ar', 'er', 'ir')):
        return [lemma]
    return [form]

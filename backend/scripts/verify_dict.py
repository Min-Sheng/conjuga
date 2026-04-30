#!/usr/bin/env python3
"""
verify_dict.py — Probe what data we can get for Spanish verbs from kaikki.org,
and identify what's missing (Chinese translations).

Strategy: kaikki.org provides per-word JSONL files at predictable URLs:
  https://kaikki.org/dictionary/Spanish/meaning/<L1>/<L2>/<word>.jsonl
where L1 = first letter, L2 = first two letters.

This means we DON'T need to download the 700MB full dump — we can fetch
per-verb on demand and cache.

Run:  python3 verify_dict.py
"""
import json
import ssl
import sys
import urllib.request
from pathlib import Path

TARGETS = ["hablar", "ser", "decir", "haber", "poner"]
CACHE_DIR = Path(__file__).parent / "data" / "kaikki"
KAIKKI_BASE = "https://kaikki.org/dictionary/Spanish/meaning"

# Some macOS Pythons ship without CA bundle — skip verify (read-only public data).
SSL_CTX = ssl.create_default_context()
SSL_CTX.check_hostname = False
SSL_CTX.verify_mode = ssl.CERT_NONE


def kaikki_url(word: str) -> str:
    w = word.lower()
    return f"{KAIKKI_BASE}/{w[0]}/{w[:2]}/{w}.jsonl"


def fetch(word: str) -> str:
    """Return raw JSONL text for a word. Caches to disk."""
    cache = CACHE_DIR / f"{word}.jsonl"
    if cache.exists():
        return cache.read_text(encoding="utf-8")
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    url = kaikki_url(word)
    print(f"  ↓ fetching {url}", file=sys.stderr)
    raw = urllib.request.urlopen(url, timeout=30, context=SSL_CTX).read().decode("utf-8")
    cache.write_text(raw, encoding="utf-8")
    return raw


def extract(word: str) -> dict:
    """Pull just the fields we'd actually display in the app."""
    raw = fetch(word)
    out = {
        "word": word,
        "found": False,
        "ipa": None,
        "etymology": None,
        "senses": [],          # list of {gloss, tags, example}
        "translations_zh": [], # what kaikki gives us (likely empty)
        "raw_translations_total": 0,
    }
    for line in raw.splitlines():
        if not line.strip():
            continue
        entry = json.loads(line)
        if entry.get("pos") != "verb":
            continue
        out["found"] = True
        # IPA — first one
        for s in entry.get("sounds") or []:
            if s.get("ipa"):
                out["ipa"] = s["ipa"]
                break
        out["etymology"] = (entry.get("etymology_text") or "").strip() or None
        # Senses
        for sense in entry.get("senses", []):
            for g in sense.get("glosses", []) or []:
                ex = ""
                for e in (sense.get("examples") or []):
                    if e.get("text"):
                        ex = f"{e['text']} — {e.get('english', '')}"
                        break
                out["senses"].append({
                    "gloss": g,
                    "tags": sense.get("tags", []),
                    "example": ex,
                })
        # Translations
        trs = entry.get("translations") or []
        out["raw_translations_total"] += len(trs)
        for t in trs:
            code = (t.get("code") or "").lower()
            lang = (t.get("lang") or "").lower()
            if code in ("zh", "cmn", "yue", "zh-hant", "zh-hans") \
               or "chinese" in lang or "mandarin" in lang:
                out["translations_zh"].append({
                    "lang": t.get("lang", ""),
                    "code": code,
                    "word": t.get("word", ""),
                    "sense": t.get("sense", ""),
                })
    return out


def print_report(data: dict) -> None:
    w = data["word"]
    print(f"\n{'═' * 72}")
    print(f"  {w}")
    print(f"{'═' * 72}")
    if not data["found"]:
        print("  ✗ not found as a verb on kaikki")
        return
    print(f"  IPA          : {data['ipa'] or '—'}")
    if data["etymology"]:
        ety = data["etymology"]
        print(f"  Etymology    : {ety[:120]}{'…' if len(ety) > 120 else ''}")
    print(f"  EN glosses   : {len(data['senses'])} sense(s)")
    for i, s in enumerate(data["senses"][:6], 1):
        tags = f"  [{', '.join(s['tags'])}]" if s["tags"] else ""
        print(f"     {i}. {s['gloss']}{tags}")
        if s["example"]:
            print(f"        ex: {s['example'][:90]}")
    if len(data["senses"]) > 6:
        print(f"     … and {len(data['senses']) - 6} more sense(s)")
    print(f"  ZH directly  : {len(data['translations_zh'])}  "
          f"(out of {data['raw_translations_total']} total translations on this entry)")
    for t in data["translations_zh"]:
        print(f"     · {t['word']}  [{t['code'] or t['lang']}]  "
              f"{('— ' + t['sense'][:50]) if t['sense'] else ''}")


def main() -> None:
    print(f"Fetching {len(TARGETS)} verbs from kaikki.org (per-word JSONL URLs)…")
    results = []
    for v in TARGETS:
        results.append(extract(v))

    for r in results:
        print_report(r)

    # Summary
    print(f"\n{'═' * 72}")
    print("  SUMMARY")
    print(f"{'═' * 72}")
    total_senses = sum(len(r["senses"]) for r in results)
    total_zh     = sum(len(r["translations_zh"]) for r in results)
    avg_size_kb  = sum((CACHE_DIR / f"{r['word']}.jsonl").stat().st_size
                       for r in results if r["found"]) / 1024 / max(1, len(results))
    print(f"  Verbs probed         : {len(results)}")
    print(f"  All found?           : {all(r['found'] for r in results)}")
    print(f"  Total EN sense glosses: {total_senses}")
    print(f"  Total ZH translations : {total_zh}")
    print(f"  Avg per-word file size: {avg_size_kb:.1f} KB")
    print(f"  Cache dir            : {CACHE_DIR}")

    print()
    if total_zh == 0:
        print("  → kaikki Spanish entries have NO Chinese translations.")
        print("    English glosses are excellent (use them as the source of truth).")
        print("    For Chinese: feed each EN gloss to an LLM (Claude Haiku) and cache.")
    else:
        print(f"  → {total_zh} Chinese translations found — partial coverage.")


if __name__ == "__main__":
    main()

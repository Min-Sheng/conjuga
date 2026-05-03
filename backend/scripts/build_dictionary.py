#!/usr/bin/env python3
"""
build_dictionary.py — Pre-seed the app's dictionary_cache from the full kaikki.org dump.

Usage:
    cd backend
    python scripts/build_dictionary.py [--db app.db]

What it does:
  1. Downloads kaikki.org-dictionary-Spanish.jsonl (~900 MB, skipped if already present)
     next to this script in scripts/.
  2. Parses every Spanish verb entry and extracts English glosses.
  3. Inserts results into the `dictionary_cache` table of the specified SQLite database.

This is an optional one-time setup step. Without it the app fetches meanings
on-demand from kaikki.org and caches them automatically, but pre-seeding avoids
cold-start network calls and enables fully-offline operation.
"""
import argparse
import json
import sqlite3
import ssl
import urllib.request
from pathlib import Path

ssl._create_default_https_context = ssl._create_unverified_context

SCRIPT_DIR  = Path(__file__).parent
KAIKKI_URL  = "https://kaikki.org/dictionary/Spanish/kaikki.org-dictionary-Spanish.jsonl"
KAIKKI_FILE = SCRIPT_DIR / "kaikki.org-dictionary-Spanish.jsonl"


def download_dump():
    if KAIKKI_FILE.exists():
        print(f"Dump already present: {KAIKKI_FILE}")
        return
    print(f"Downloading {KAIKKI_URL} ...")
    urllib.request.urlretrieve(KAIKKI_URL, KAIKKI_FILE)
    print("Download complete.")


def seed_cache(db_path: str):
    if not KAIKKI_FILE.exists():
        raise FileNotFoundError(f"Dump not found: {KAIKKI_FILE}. Run download first.")

    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS dictionary_cache (
            word       TEXT PRIMARY KEY,
            en_senses  TEXT NOT NULL,
            fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()

    verb_senses: dict = {}
    count = 0
    print("Parsing dump (verb entries only) …")
    with open(KAIKKI_FILE, encoding="utf-8") as f:
        for line in f:
            entry = json.loads(line)
            if entry.get("lang") != "Spanish" or entry.get("pos") != "verb":
                continue
            word = entry.get("word", "").strip()
            if not word:
                continue
            glosses = [
                g
                for sense in entry.get("senses", [])
                for g in sense.get("glosses", [])
                if g
            ]
            if word not in verb_senses:
                verb_senses[word] = []
            verb_senses[word].extend(glosses)
            count += 1
            if count % 50_000 == 0:
                print(f"  … {count:,} verb entries processed")

    print(f"Parsed {count:,} verb entries → {len(verb_senses):,} unique verbs")

    rows = [
        (word, json.dumps(list(dict.fromkeys(senses)), ensure_ascii=False))
        for word, senses in verb_senses.items()
    ]
    conn.executemany(
        "INSERT OR REPLACE INTO dictionary_cache (word, en_senses) VALUES (?, ?)",
        rows,
    )
    conn.commit()
    conn.close()
    print(f"Seeded {len(rows):,} verbs into {db_path}")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--db", default="app.db", help="Path to the app SQLite database (default: app.db)")
    parser.add_argument("--skip-download", action="store_true", help="Skip downloading the dump")
    args = parser.parse_args()

    if not args.skip_download:
        download_dump()
    seed_cache(args.db)


if __name__ == "__main__":
    main()

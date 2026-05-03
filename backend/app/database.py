import sqlite3
from contextlib import contextmanager

from app.config import settings

_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    google_id TEXT UNIQUE,
    display_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS dictionary_cache (
    word TEXT PRIMARY KEY,
    en_senses TEXT NOT NULL,
    fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_vocabulary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verb_infinitive TEXT NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    look_up_count INTEGER DEFAULT 1,
    UNIQUE(user_id, verb_infinitive)
);

CREATE TABLE IF NOT EXISTS srs_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verb_infinitive TEXT NOT NULL,
    mood TEXT NOT NULL,
    tense TEXT NOT NULL,
    person TEXT NOT NULL,
    correct_form TEXT NOT NULL,
    ease_factor REAL DEFAULT 2.5,
    interval_days INTEGER DEFAULT 1,
    repetitions INTEGER DEFAULT 0,
    due_date DATE DEFAULT (DATE('now')),
    last_reviewed DATETIME,
    UNIQUE(user_id, verb_infinitive, mood, tense, person)
);

CREATE TABLE IF NOT EXISTS quiz_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_id INTEGER NOT NULL REFERENCES srs_cards(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    question_type TEXT NOT NULL CHECK(question_type IN ('multiple_choice','fill_in')),
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL,
    quality INTEGER NOT NULL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_srs_due ON srs_cards(user_id, due_date);
"""


def init_db() -> None:
    """Create all tables if they don't exist."""
    with get_db() as conn:
        conn.executescript(_SCHEMA_SQL)
        conn.commit()


@contextmanager
def get_db():
    """Context manager returning a sqlite3.Connection with row_factory and foreign keys enabled."""
    conn = sqlite3.connect(settings.DATABASE_URL, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()


def get_db_dep():
    """FastAPI dependency (generator) that yields a DB connection."""
    with get_db() as conn:
        yield conn

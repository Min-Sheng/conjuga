# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Conjuga** is a progressive web app (PWA) for learning Spanish verb conjugations. It combines intelligent verb lookup, a spaced repetition system (SRS) for quiz scheduling, and an account system with Google OAuth support.

**Tech Stack:**
- **Backend:** FastAPI (Python 3.11+) with SQLite (raw sqlite3, no ORM)
- **Frontend:** React 19, Vite, TailwindCSS v4, React Router, TanStack Query
- **Key Libraries:** verbecc (verb conjugation), simplemma (lemmatization), kaikki.org (dictionary)
- **Auth:** JWT via python-jose, bcrypt, Google OAuth 2.0
- **PWA:** vite-plugin-pwa

## Development Commands

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env  # Update SECRET_KEY and OAuth config if needed

# Start dev server (http://localhost:8000)
./run.sh
# Or manually: .venv/bin/uvicorn app.main:app --reload

# API docs: http://localhost:8000/docs (Swagger UI)
```

**Important:** The backend reads from `.env` for configuration. Key variables:
- `SECRET_KEY`: JWT signing key (change in production)
- `DATABASE_URL`: Path to SQLite DB (default: `app.db`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: Optional; enables Google OAuth
- `FRONTEND_URL` / `BACKEND_URL`: URLs for OAuth redirects

### Frontend

```bash
cd frontend
npm install

# Start dev server (http://localhost:5173)
# /api requests proxy to http://localhost:8000
npm run dev

# Production build
npm run build

# Lint
npm lint
```

No test framework (jest/vitest) is configured.

### Dictionary Caching (Optional)

```bash
cd backend
python scripts/build_dictionary.py --db app.db
```
Downloads the full kaikki.org Spanish dictionary and pre-caches it. Use `--skip-download` to reuse an existing local file.

## Architecture

### Backend Structure

**Router-based organization** (`app/main.py` mounts routers):
- `auth/`: Registration, login, JWT validation, Google OAuth callback, profile updates
- `verbs/`: Lookup any conjugated form, return infinitive + full conjugation table
- `vocabulary/`: User's personal verb library with per-tense familiarity tracking
- `srs/`: Quiz card scheduling, answer logging, stats

**Database** (`app/database.py`):
- Initialized on startup via `init_db()`
- Tables: `users`, `vocabulary`, `quiz_log`, `dictionary_cache`
- Raw SQL queries; use `db.execute()` to run statements

**Key Services:**
- `verbs/service.py`: `get_conjugator()` (cached verbecc instance), `get_conjugations()`, `get_meaning()`
- `auth/service.py`: Token creation/validation, password hashing, Google OAuth
- `srs/service.py`: Familiarity scoring based on quiz history
- `verbs/lookup_index.py`: Fast lookup of conjugated forms → infinitive

### Frontend Structure

**Routing** (`App.jsx`):
- `/auth`: Login/register (public)
- `/`: Search page (protected)
- `/verb/:infinitive`: Conjugation table + add to vocab (protected)
- `/vocab`: User's vocabulary list (protected)
- `/quiz`: SRS quiz interface (protected)

**State Management:**
- `AuthContext` (`App.jsx`): User, login/logout, token handling
- `TanStack Query`: Data fetching, caching for API calls
- Local token storage via `localStorage` (token + JWT validation)

**API Client** (`src/api/client.js`):
- `setToken()` / `clearToken()` manage JWT in localStorage
- HTTP interceptor adds `Authorization` header to all requests
- OAuth callback handling: extracts token from `#token=...` URL hash, stores it, navigates to `/`

**Components:**
- `NavBar`, `ProfileModal`: Common UI
- `MoodSection`: Collapses conjugation table by grammatical mood

### Verb Lookup Pipeline

1. User enters any form (e.g., "fueron", "dijiste")
2. `verbs/lookup_index.py` maps form → infinitive via cached index
3. `verbs/service.py` → `get_conjugations()` + `get_meaning()` 
4. Returns: infinitive, meanings, 22 tenses × moods × persons
5. Frontend displays conjugations grouped by mood, color-coded by familiarity

### SRS Familiarity Algorithm

Each card (verb × tense × person) tracks answer history in `quiz_log`. Familiarity is determined by the **lowest** person's correct-answer rate:

| State | Condition |
|-------|-----------|
| New | Never answered |
| Needs Practice | Any person < 40% correct |
| Practicing | Has history, not yet mastered |
| Mastered | All persons ≥ 80% correct **and** ≥ 5 attempts each |

Quiz scheduling prioritizes lowest-scoring cards; new cards are always shown before practiced ones.

## Important Patterns & Constraints

### Database Queries

- **No ORM:** Use raw SQL with parameterized queries to prevent injection
- Pattern: `db.execute("SELECT ... WHERE col = ?", (param,))`
- Always check `.fetchone()` / `.fetchall()` return values (None if no rows)

### JWT & Authentication

- `python-jose` with `HS256` algorithm
- Token stored in browser localStorage; sent as `Authorization: Bearer <token>`
- OAuth callback via hash fragment (`#token=...`) to avoid exposing token in server logs
- Token expiration set by `ACCESS_TOKEN_EXPIRE_MINUTES` (default: 10080 = 7 days)

### Frontend API Calls

- All calls via `src/api/client.js` wrapper (handles token + error cases)
- Responses auto-intercepted for `401` → redirect to `/auth` (token expired)
- Use TanStack Query's `useQuery` / `useMutation` for caching and state

### PWA & Offline

- Service worker auto-updated via `vite-plugin-pwa`
- Dictionary data is cached in SQLite, so lookups work offline (if dictionary pre-built)
- Quiz state persists locally; sync on reconnection not yet implemented

## Git & Commit Style

Repository uses descriptive commit messages:
- `chore:` project setup, dependencies, structure
- `fix:` bug fixes
- `docs:` README or documentation
- `feat:` new features (rare; most work is incremental)

See recent commits for examples.

# AGENTS.md — operating rules for AI coding agents

These rules apply to every AI agent working in this repository (Claude Code, Codex, Copilot, etc.).
If anything here conflicts with CLAUDE.md, README.md or any other file, **this file wins**.

## 1. Purpose

Movie Tracker (CineTrack) is a full-stack app for browsing movies, writing reviews and keeping a private watchlist:
an Angular frontend talks to a Django REST Framework backend over a JWT-protected REST API.
It is finished at v1.0.0 and is not deployed; new work follows "Future ideas" in CLAUDE.md.

## 2. Architecture

**Backend** — `backend/`: Django 6 + Django REST Framework + `djangorestframework-simplejwt` (token blacklist on),
SQLite locally (PostgreSQL via `DATABASE_URL` is prepared but unused). API docs: drf-spectacular at `/api/docs/`.
- `movie_tracker/` — project settings (env-driven) and root `urls.py`
- `movies/` — the only app: `models.py`, `serializers.py`, `views.py` (APIView + `@api_view`), `urls.py` (all `/api/` routes),
  `pagination.py`, `schema.py`, `tmdb.py`, `tests.py`, `migrations/`, `management/commands/` (`seed_movies`, `create_admin`)

**Frontend** — `frontend/`: Angular 21, standalone components, zoneless (signals for state), Vitest for tests.
- `src/app/core/` — API config, auth interceptor, guards
- `src/app/features/` — pages: `auth`, `movies`, `watchlist`, `profile`
- `src/app/services/`, `src/app/models/`, `src/app/shared/` — HTTP services, interfaces, shared components/pipes/helpers
- `src/environments/` — API URL per environment; `src/styles.css` — design system

CI: `.github/workflows/ci.yml` runs the backend check + tests and the frontend tests + build on push/PR to `main`.

## 3. Setup

Requirements: Python 3.12+ (CI uses 3.14 from `.python-version`), Node.js 20.19+ or 22.12+, npm.

**Windows PowerShell**
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_movies
cd ..\frontend
npm ci
```

**bash**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Git Bash on Windows: source venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_movies
cd ../frontend
npm ci
```

Setup installs only what the lock/requirements files already pin; it is not a dependency change.
`ng test` fails to find tests if the project path contains `(` or `)` — see CLAUDE.md Notes.

## 4. Safe commands (may run without asking)

| Where | Command |
|---|---|
| `backend/` | `python manage.py check` |
| `backend/` | `python manage.py test movies` |
| `frontend/` | `npx ng test --watch=false` |
| `frontend/` | `npx ng build` |
| repo root | `git status`, `git diff`, `git log` |

Anything else (other `manage.py` commands, `npm install`, git writes, scripts) — ask first.

## 5. Coding conventions

Keep the existing style: backend views stay APIView / `@api_view` with serializers in `serializers.py` and
`@extend_schema` on every endpoint; frontend uses standalone components with separate `.html`/`.css`, services in
`services/`, interfaces in `models/`, signals for state, `API_URL` from environments (never hard-coded), and only
`var(--...)` design tokens in component CSS. No new heavy dependencies.
**See CLAUDE.md for the full conventions and design notes.**

## 6. Test expectations

- Every behaviour change needs a test: backend in `backend/movies/tests.py`, frontend as a `*.spec.ts` next to the code.
- Existing tests must not be weakened, skipped or deleted to make a change pass.
- Never call real external APIs in tests (TMDB is mocked via `movies/tmdb.py::_get`).
- Report the real command output. Never claim tests pass without running them; if a check was not run, say so.

## 7. Acceptance criteria (must stay true)

- **AC1** Anyone can list/search/filter/sort movies; `GET /api/movies/` is paginated (12/page);
  only admins (`is_staff`) can create/edit/delete movies.
- **AC2** Register and login with JWT (access + refresh); the frontend refreshes once on 401 and retries;
  logout blacklists the refresh token.
- **AC3** One review per user per movie; only the owner deletes it; movie rating = average stars × 2, else `base_rating`.
- **AC4** A watchlist is private: users see and change only their own entries.
- **AC5** All checks stay green: `manage.py check`, backend tests, frontend tests, `ng build`.

## 8. Forbidden actions

- **No secrets:** never write real keys or passwords into files, commits or command lines; `.env` stays git-ignored
  (use `backend/.env.example` as the template).
- **No production deployments:** no Render/Netlify deploy, no publishing of any kind.
- **No destructive commands:** `rm -rf`, `git push --force`, `git reset --hard`, `git clean -fd`, deleting migrations,
  `manage.py flush` or dropping/deleting the database.
- **No unreviewed dependency changes:** do not add, remove or upgrade packages (`requirements.txt`, `package.json`,
  lock files), and never run `npm audit fix --force`, without explicit approval.
- **No commits or pushes; do not touch `main`.** Work only on the current feature branch.

## 9. Review gates

1. **Propose** a minimal diff first and wait for approval.
2. **After approval**, apply it, run the safe checks (section 4) and paste the real output.
3. **A human** reviews the change and commits it.

# Movie Tracker (CineTrack) — project notes for Claude Code

Started as a KBTU Web Development team project (Ryskulov Alikhan, Assylbek Manarbek, Kenzhetayev Kaisar);
further developed by Alikhan Ryskulov as a solo project.
Goal: full-stack app showing Angular <-> DRF over REST, JWT auth, CRUD, clean UI. README.md lists the features.

**Status: finished — v1.0.0 (git tag).** The app is NOT deployed and won't be. The production setup (env-driven settings,
gunicorn/whitenoise/PostgreSQL, `build.sh`, `netlify.toml`, DEPLOY.md) stays as a guide only. New work = "Future ideas" below.

## Stack & how to run
- backend/: Django 6 + DRF + simplejwt (token_blacklist enabled), SQLite, CORS for http://localhost:4200
  - `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py seed_movies && python manage.py runserver`
  - All API routes live under `/api/` in `backend/movies/urls.py`; views are APIView classes / @api_view functions in `views.py`
- frontend/: Angular 21, standalone components, new control flow (`@if`, `@for`), FormsModule/ngModel, functional interceptor + guard
  - `cd frontend && npm install && ng serve` (http://localhost:4200)
  - API base URL: `API_URL` in `frontend/src/app/core/api.config.ts`, read from `src/environments/environment*.ts`
    (`.development.ts` = localhost for `ng serve`/`ng test`, `environment.ts` = production URL from DEPLOY.md for `ng build`).
    Never hard-code it.
  - The app is zoneless (no zone.js): keep component state that is set inside `subscribe()` in signals, or the view won't update.

## Conventions
- Keep the existing style: standalone components with separate .html/.css files, services in `src/app/services`, interfaces in `src/app/models`.
- Backend: keep APIView/@api_view style (course requirement is to show both FBV and CBV), serializers in `serializers.py`.
- Movie writes (POST/PUT/DELETE) are admin-only (`is_staff`) — decided, keep it. Frontend checks `AuthService.isAdmin()`.
- Movie rating is out of 10; always display it with the `rating` pipe (`shared/rating.pipe.ts`) -> "★ 8.8/10".
- `GET /api/movies/` is paginated (`MoviePagination`, 12/page): `{count, total_pages, next, previous, results}`.
  Search/filter/sort happen on the backend (`search`, `genre` id, `content_type`, `ordering` from `MOVIE_ORDERING_FIELDS`);
  never filter movies client-side. Frontend: `MovieService.getMovies(query)` -> `MoviePage`.
- Auth: on 401 the interceptor calls `AuthService.refreshAccessToken()` (`POST /api/token/refresh/`) once and retries;
  only if refresh fails does it `clearSession('/login')`. Requests in `PUBLIC_URLS` never get a token or a refresh.
- No new heavy dependencies (no Angular Material, no NgRx) unless asked.
- Design system: every color, font size, spacing, radius and shadow is a CSS variable in `frontend/src/styles.css`
  (dark values under `:root, [data-theme='dark']`, light under `[data-theme='light']`). Component CSS uses only `var(--...)`,
  never raw hex/rgb. Shared classes live there too: `.container`, `.btn` (+ `-primary/-ghost/-danger/-sm/-block`), `.card`,
  `.field`/`.field-label`/`.field-error`, `.alert-error/-success`, `.chip`, `.rating-text`, `.poster-img`, `.backdrop`, `.auth-*`.
  Component styles have a 4 kB budget: put reusable styling in styles.css, keep component CSS to layout.
  Look (matches the mockup the user approved): glass surfaces use `--glass-bg/-bg-hover/-border` + `--shadow-card`;
  orange glow = `--glow-accent` (hover) / `--glow-poster`; avatars `--gradient-accent` (`.avatar-dot`); metadata as pills
  (`.chip`, `.chip-rating` = orange); buttons: primary filled orange, `.btn-outline` orange ("+ Add ..."),
  `.btn-danger` red outline; small uppercase orange `.eyebrow` above page titles.
  Dark is the default theme (OS setting ignored); light only when the user toggles it.
  The movie-list hero is ALWAYS dark (fixed `--hero-*` tokens, not themed): poster on the right with a masked left edge,
  dark gradient from the left, short fade into `--color-bg` at the bottom (keep it short or light mode greys the buttons).
- Theme: `ThemeService` (signal + `localStorage['theme']`) sets `data-theme` on `<html>`; a small script in `index.html` applies it
  before Angular boots (no flash). Breakpoints used: 960px (tablet), 760px (navbar menu button), 600px (phone).
- After backend model changes: `python manage.py makemigrations && python manage.py migrate`.
- Verify work: `python manage.py check`, `python manage.py test movies`, `ng build`, `ng test --watch=false`.

## Completed (v1.0.0)
- **Core app** (course project, finished): real API data instead of mocks; `seed_movies` (4 genres, 8 movies with TMDB
  posters, backdrops and ids, safe to re-run); admin-only movie CRUD (`IsAdminUser`, `adminGuard`, shared `MovieForm` with
  validation and poster preview); `GET /api/genres/`; reviews (one per user+movie, owner-only delete) with
  `Movie.update_rating()` = average stars * 2, else `base_rating`; watchlist with status PATCH/DELETE and tabs;
  YouTube trailers (`shared/youtube.ts` checks the id); no `alert()`, signals everywhere.
- **Auth & profile:** JWT with logout blacklist; interceptor refreshes once on 401 and retries (shared refresh);
  `PATCH /api/profile/` (username, email), `POST /api/profile/password/`.
- **Movie list:** backend pagination (12/page), search, genre/type filters, ordering; debounced search, page buttons, sort.
- **Design:** cinema theme matching the approved mockup, design system in `styles.css`, dark default + light toggle,
  always-dark hero with `backdrop_url`, responsive (see Conventions).
- **TMDB import (admin):** `movies/tmdb.py` (urllib client; every request goes through `_get`, which tests mock — never call
  the real API in tests), `GET /api/tmdb/search/?q=`, `POST /api/tmdb/import/ {tmdb_id}`. `Movie.tmdb_id` (unique,
  migration 0008) prevents duplicates; a same title+year movie without tmdb_id is linked. Page `/movies/import`.
  Key: `TMDB_API_KEY` env var or git-ignored `backend/.env` (see `backend/.env.example`).
- **API docs:** drf-spectacular, Swagger UI `/api/docs/`, schema `/api/schema/`.
- **Quality:** GitHub Actions CI (`.github/workflows/ci.yml`: backend check/tests/deploy-check/collectstatic, frontend
  `npm ci`/test/build on push + PR to main). Tests at v1.0.0: 89 backend (`movies/tests.py`), 44 frontend (Vitest).

## Future ideas (not started)
- Stats page with charts (e.g. watchlist by status, reviews per genre, ratings over time).
- Recommendations (e.g. based on genres of highly rated / completed movies).
- Custom lists (user-created named lists of movies, beyond the single watchlist).

## Notes
- API docs: drf-spectacular, Swagger UI at `/api/docs/`, schema at `/api/schema/`. Views stay APIView/@api_view, so
  every new endpoint needs `@extend_schema(tags, summary, description, request, responses)`; docs-only response shapes
  live in `movies/schema.py`. Check with `python manage.py spectacular --file NUL --validate` (0 errors, 0 warnings).
- `Movie.backdrop_url` (optional, migration 0007): wide image for the hero + movie-detail background. Frontend always goes
  through `shared/backdrop.ts` (`backdropImage()` = backdrop, else poster; `usesPosterAsBackdrop()` picks the poster crop).
  seed_movies has real TMDB w1280 backdrops (checked: 1280x720 JPEGs). After pulling: `migrate` + `seed_movies`.
- Production config (prepared, not used — app isn't deployed) is env-driven (`movie_tracker/settings.py`): `SECRET_KEY`, `DEBUG` (defaults off when Render's `RENDER`
  var exists), `ALLOWED_HOSTS` (+ `RENDER_EXTERNAL_HOSTNAME` auto-added), `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`
  (absent -> SQLite). DEBUG off with the dev key -> ImproperlyConfigured. Free Render has no SSH: admin comes from
  `DJANGO_SUPERUSER_*` via `manage.py create_admin` (idempotent, never resets a password). Python pinned in `.python-version`.
- New Python packages go into `backend/requirements.txt` with exact versions; CI installs from it.
- Vitest finds no test files when the project path contains brackets (e.g. `Movie-Tracker-main (2)`): run `ng test` from a path
  without `(` `)` (a clone, or a junction/symlink to the folder).
- Every new backend behaviour gets a test in `movies/tests.py`; every new component gets a spec with the providers it needs.

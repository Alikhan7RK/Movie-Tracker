# Movie Tracker (CineTrack) — project notes for Claude Code

Started as a KBTU Web Development team project (Ryskulov Alikhan, Assylbek Manarbek, Kenzhetayev Kaisar);
now Alikhan's solo project, developed further along the Roadmap below.
Goal: full-stack app showing Angular <-> DRF over REST, JWT auth, CRUD, clean UI. README.md lists the promised features.

## Stack & how to run
- backend/: Django 6 + DRF + simplejwt (token_blacklist enabled), SQLite, CORS for http://localhost:4200
  - `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py seed_movies && python manage.py runserver`
  - All API routes live under `/api/` in `backend/movies/urls.py`; views are APIView classes / @api_view functions in `views.py`
- frontend/: Angular 21, standalone components, new control flow (`@if`, `@for`), FormsModule/ngModel, functional interceptor + guard
  - `cd frontend && npm install && ng serve` (http://localhost:4200)
  - API base URL: `API_URL` in `frontend/src/app/core/api.config.ts`, read from `src/environments/environment*.ts`
    (`.development.ts` = localhost for `ng serve`/`ng test`, `environment.ts` = Render URL for `ng build`). Never hard-code it.
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
  (`.chip`, `.chip-lg`, `.chip-rating` = orange); buttons: primary filled orange, `.btn-outline` orange ("+ Add ..."),
  `.btn-danger` red outline; small uppercase orange `.eyebrow` above page titles.
- Theme: `ThemeService` (signal + `localStorage['theme']`) sets `data-theme` on `<html>`; a small script in `index.html` applies it
  before Angular boots (no flash). Breakpoints used: 960px (tablet), 760px (navbar menu button), 600px (phone).
- After backend model changes: `python manage.py makemigrations && python manage.py migrate`.
- Verify work: `python manage.py check`, `python manage.py test movies`, `ng build`, `ng test --watch=false`.

## Known gaps / bugs (the "finish the project" list)
### Done
1. ~~Movies are mock data~~ — DONE: `MovieService` uses HttpClient (`getMovies`, `getMovie`, `getGenres`, `createMovie`, `updateMovie`,
   `deleteMovie`); `Movie` interface in `models/movie.model.ts`; movie-card/list/detail use API data with loading + error states.
   Movie model got `director`, `actors`, `country`, `duration` (minutes) — migration 0004.
2. ~~No seed data~~ — DONE: `python manage.py seed_movies` (4 genres, 8 movies, safe to re-run).
5. ~~Movie CRUD has no UI and no protection~~ — DONE. Backend: GET is public, POST/PUT/DELETE need `IsAdminUser`; `genre_ids` is
   `required=False`; year 1888..now+5 and base_rating 0..10 validated. `/api/profile/` returns `is_staff`; AuthService stores it.
   Frontend: shared `MovieForm` for `/movies/new` and `/movies/:id/edit` (protected by `adminGuard`), poster preview, validation;
   "Add movie" on the list and Edit/Delete (inline confirmation) on the detail page, only for admins.
   Detail page embeds YouTube trailers (`shared/youtube.ts` extracts and checks the video id before trusting the URL).
   Movie list has a content_type filter.
6. ~~Genres are hard-coded~~ — DONE: `GET /api/genres/` (public), loaded into the movie-list filter.
7. ~~Expired token breaks public pages~~ — DONE: interceptor catches 401 on authenticated requests, clears session, redirects to /login.
8. ~~Pending migration~~ — DONE (0003).
9. ~~requirements.txt is UTF-16~~ — DONE (UTF-8).
3. ~~Reviews are local only~~ — DONE: `GET /api/reviews/?movie=<id>` is public; POST needs login and updates the user's existing
   review instead of creating a second one (unique user+movie, migration 0005); `DELETE /api/reviews/<id>/` (owner only, else 403).
   After every create/update/delete `Movie.update_rating()` sets rating = average stars * 2, or `base_rating` (the original
   rating, migration 0006, set by seed_movies / the admin form) when there are no reviews. `rating` is read-only in the API.
   movie-detail loads reviews (username, stars, date), form only for logged-in users, owner can delete their review.
4. ~~Watchlist can't be changed~~ — DONE: `PATCH` (status only) and `DELETE` on `/api/watchlist/<id>/`; other users get 404.
   Watchlist page: status dropdown, Remove button, All/Planned/Watching/Completed tabs. movie-detail shows the status if the
   movie is already in the watchlist.
10. ~~UX polish~~ — DONE: no `alert()` (inline messages), local placeholder `public/no-poster.svg`, rating "★ x.x/10" via the
    `rating` pipe, `@if` everywhere, watchlist + profile pages use signals.

11. ~~Tests~~ — DONE: `backend/movies/tests.py` has APITestCase tests (66 after Stage 1) (auth/JWT/logout, genres, movie permissions + validation,
    reviews + rating + fallback, watchlist ownership, seed_movies). Angular: all specs pass with `ng test --watch=false` (Vitest),
    incl. unit tests for the rating pipe and the YouTube helper.
12. ~~README~~ — DONE: features, setup (migrate, createsuperuser, seed_movies), all endpoints, project structure.

## Roadmap
### Stage 1 — DONE
- ~~Auto token refresh~~ — interceptor refreshes on 401, retries once, shares one refresh between parallel requests.
- ~~Backend pagination / search / sorting~~ — see Conventions; movie list has debounced search, page buttons, sort dropdown.
- ~~Edit profile + change password~~ — `PATCH /api/profile/` (username, email), `POST /api/profile/password/`
  (`old_password`, `new_password`, min 4 like register). Profile page has both forms; username in localStorage is kept in sync.

### Stage 2 — features
- TMDB import for admins (search TMDB, prefill/create a movie; API key in env, never committed).
- Stats page with charts (e.g. watchlist by status, reviews per genre, ratings over time).
- Recommendations (e.g. based on genres of highly rated / completed movies).
- Custom lists (user-created named lists of movies, beyond the single watchlist).

### Stage 3 — production
- ~~CI + deployment prep~~ — DONE: `.github/workflows/ci.yml` (backend check/tests/deploy-check/collectstatic, frontend
  `npm ci`/test/build on push+PR to main). Settings read env vars (see below); `backend/build.sh`; `netlify.toml`; DEPLOY.md.
  Not deployed yet — the user follows DEPLOY.md.
- ~~Responsive design + dark/light theme~~ — DONE early (cinema redesign, see Conventions).

### Notes
- Production config is env-driven (`movie_tracker/settings.py`): `SECRET_KEY`, `DEBUG` (defaults off when Render's `RENDER`
  var exists), `ALLOWED_HOSTS` (+ `RENDER_EXTERNAL_HOSTNAME` auto-added), `CORS_ALLOWED_ORIGINS`, `DATABASE_URL`
  (absent -> SQLite). DEBUG off with the dev key -> ImproperlyConfigured. Free Render has no SSH: admin comes from
  `DJANGO_SUPERUSER_*` via `manage.py create_admin` (idempotent, never resets a password). Python pinned in `.python-version`.
- New Python packages go into `backend/requirements.txt` with exact versions; CI installs from it.
- Vitest finds no test files when the project path contains brackets (e.g. `Movie-Tracker-main (2)`): run `ng test` from a path
  without `(` `)` (a clone, or a junction/symlink to the folder).
- Every new backend behaviour gets a test in `movies/tests.py`; every new component gets a spec with the providers it needs.

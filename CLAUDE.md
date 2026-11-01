# Movie Tracker (CineTrack) — project notes for Claude Code

University Web Development course project (KBTU). Team: Ryskulov Alikhan, Assylbek Manarbek, Kenzhetayev Kaisar.
Goal: full-stack app showing Angular <-> DRF over REST, JWT auth, CRUD, clean UI. README.md lists the promised features.

## Stack & how to run
- backend/: Django 6 + DRF + simplejwt (token_blacklist enabled), SQLite, CORS for http://localhost:4200
  - `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py seed_movies && python manage.py runserver`
  - All API routes live under `/api/` in `backend/movies/urls.py`; views are APIView classes / @api_view functions in `views.py`
- frontend/: Angular 21, standalone components, new control flow (`@if`, `@for`), FormsModule/ngModel, functional interceptor + guard
  - `cd frontend && npm install && ng serve` (http://localhost:4200)
  - API base URL lives in one place: `frontend/src/app/core/api.config.ts` (`API_URL`). Import it, never hard-code the URL.
  - The app is zoneless (no zone.js): keep component state that is set inside `subscribe()` in signals, or the view won't update.

## Conventions
- Keep the existing style: standalone components with separate .html/.css files, services in `src/app/services`, interfaces in `src/app/models`.
- Backend: keep APIView/@api_view style (course requirement is to show both FBV and CBV), serializers in `serializers.py`.
- Movie writes (POST/PUT/DELETE) are admin-only (`is_staff`) — decided, keep it. Frontend checks `AuthService.isAdmin()`.
- Movie rating is out of 10; always display it with the `rating` pipe (`shared/rating.pipe.ts`) -> "★ 8.8/10".
- No new heavy dependencies (no Angular Material, no NgRx) unless asked.
- After backend model changes: `python manage.py makemigrations && python manage.py migrate`.
- Verify work: `python manage.py check`, `python manage.py test movies`, `ng build`.

## Known gaps / bugs (the "finish the project" list)
### Done
1. ~~Movies are mock data~~ — DONE: `MovieService` uses HttpClient (`getMovies`, `getMovie`, `getGenres`, `createMovie`, `updateMovie`,
   `deleteMovie`); `Movie` interface in `models/movie.model.ts`; movie-card/list/detail use API data with loading + error states.
   Movie model got `director`, `actors`, `country`, `duration` (minutes) — migration 0004.
2. ~~No seed data~~ — DONE: `python manage.py seed_movies` (4 genres, 8 movies, safe to re-run).
5. (backend part) ~~Movie writes are AllowAny~~ — DONE: GET is public, POST/PUT/DELETE need `IsAdminUser`; `genre_ids` is `required=False`.
   `/api/profile/` returns `is_staff`; AuthService stores it after login.
6. ~~Genres are hard-coded~~ — DONE: `GET /api/genres/` (public), loaded into the movie-list filter.
7. ~~Expired token breaks public pages~~ — DONE: interceptor catches 401 on authenticated requests, clears session, redirects to /login.
8. ~~Pending migration~~ — DONE (0003).
9. ~~requirements.txt is UTF-16~~ — DONE (UTF-8).

### Still open
3. **Reviews on the movie page are local only.** `movie-detail.ts` pushes into a local `comments` array. Use `ReviewService`.
   Backend: `GET /api/reviews/` requires auth and returns ALL reviews -> allow anonymous GET, support `?movie=<id>` filter,
   show username + date. Optionally prevent duplicate reviews per user/movie and recompute `Movie.rating` from review average.
4. **Watchlist status can't be changed or removed.** Only list/create exist. Add `PATCH` and `DELETE` on `/api/watchlist/<id>/`
   (only the owner), and a status dropdown + Remove button in the watchlist page. Optional: filter tabs Planned/Watching/Completed.
5. (frontend part) **Movie CRUD has no UI.** Add an Add/Edit movie form page + Delete button in Angular, shown only when `isAdmin()`.
10. **UX polish:** replace `alert()` in movie-detail with an inline message/toast; `via.placeholder.com` is dead (watchlist page) — use a
    local placeholder. (Done: rating shown as "★ x.x/10" everywhere via the `rating` pipe; movie-detail uses `@if`.)
    Watchlist and profile pages still keep HTTP results in plain fields — move them to signals (zoneless app).
11. **Tests:** `backend/movies/tests.py` is empty. Add APITestCase tests for register/login, movies CRUD permissions, reviews, watchlist.
    Angular `.spec.ts` files are probably stale after refactors — fix or keep them minimal so `ng test` passes
    (movie-card/list/detail specs were updated with HttpClient/router providers).
12. **README**: replace "(Planned)" sections with the real endpoints and setup steps (incl. migrate + seed_movies).

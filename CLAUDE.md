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

### Still open
11. **Tests:** `backend/movies/tests.py` is empty. Add APITestCase tests for register/login, movies CRUD permissions, reviews, watchlist.
    Angular `.spec.ts` files are probably stale after refactors — fix or keep them minimal so `ng test` passes
    (movie-card/list/detail/form and watchlist specs were updated with HttpClient/router providers).
12. **README**: replace "(Planned)" sections with the real endpoints and setup steps (incl. migrate + seed_movies).

# Movie Tracker (CineTrack) — project notes for Claude Code

University Web Development course project (KBTU). Team: Ryskulov Alikhan, Assylbek Manarbek, Kenzhetayev Kaisar.
Goal: full-stack app showing Angular <-> DRF over REST, JWT auth, CRUD, clean UI. README.md lists the promised features.

## Stack & how to run
- backend/: Django 6 + DRF + simplejwt (token_blacklist enabled), SQLite, CORS for http://localhost:4200
  - `cd backend && pip install -r requirements.txt && python manage.py migrate && python manage.py runserver`
  - All API routes live under `/api/` in `backend/movies/urls.py`; views are APIView classes / @api_view functions in `views.py`
- frontend/: Angular 21, standalone components, new control flow (`@if`, `@for`), FormsModule/ngModel, functional interceptor + guard
  - `cd frontend && npm install && ng serve` (http://localhost:4200)
  - API base URL is hard-coded as `http://127.0.0.1:8000/api` in several services — centralise it.

## Conventions
- Keep the existing style: standalone components with separate .html/.css files, services in `src/app/services`, interfaces in `src/app/models`.
- Backend: keep APIView/@api_view style (course requirement is to show both FBV and CBV), serializers in `serializers.py`.
- No new heavy dependencies (no Angular Material, no NgRx) unless asked.
- After backend model changes: `python manage.py makemigrations && python manage.py migrate`.
- Verify work: `python manage.py check`, `python manage.py test movies`, `ng build`.

## Known gaps / bugs (the "finish the project" list)
1. **Movies are mock data.** `frontend/src/app/services/movie.service.ts` returns a hard-coded array; it never calls `/api/movies/`.
   Field names differ from the backend: frontend uses `image, genre, releaseDate, director, actors, country, duration`;
   backend Movie has `poster_url, genres[] {id,name}, year, description, rating, trailer_url, content_type`.
   -> Make MovieService use HttpClient, add a `Movie` interface in models/, update movie-card, movie-list, movie-detail.
   Decide whether to add `director`, `actors`, `country`, `duration` fields to the Movie model (needs migration) or drop them from the UI.
2. **No seed data.** DB is empty after migrate. Add a management command `python manage.py seed_movies` that creates genres and
   the 8 movies currently in the mock service (same titles/posters/descriptions).
3. **Reviews on the movie page are local only.** `movie-detail.ts` pushes into a local `comments` array. Use `ReviewService`.
   Backend: `GET /api/reviews/` requires auth and returns ALL reviews -> allow anonymous GET, support `?movie=<id>` filter,
   show username + date. Optionally prevent duplicate reviews per user/movie and recompute `Movie.rating` from review average.
4. **Watchlist status can't be changed or removed.** Only list/create exist. Add `PATCH` and `DELETE` on `/api/watchlist/<id>/`
   (only the owner), and a status dropdown + Remove button in the watchlist page. Optional: filter tabs Planned/Watching/Completed.
5. **Movie CRUD has no UI and no protection.** POST/PUT/DELETE `/api/movies/` are `AllowAny` -> anyone can delete movies.
   Use IsAuthenticated (or IsAdminUser for write) for unsafe methods. Add an Add/Edit movie form page + Delete button in Angular.
   `MovieSerializer.genre_ids` is required -> make it `required=False`.
6. **Genres are hard-coded** in movie-list.ts (`['Action','Drama','Sci-Fi','Crime']`). Add `GET /api/genres/` and load them.
7. **Expired token breaks public pages.** The interceptor attaches the token to every request; an expired JWT makes even AllowAny
   endpoints return 401. Handle 401 in the interceptor (clear session, redirect to /login) or don't send it for public GETs.
8. **Pending migration**: `makemigrations --check` reports AlterField id on movie/review/watchlist — generate and commit it.
9. **requirements.txt is UTF-16 encoded** — re-save as UTF-8.
10. **UX polish:** replace `alert()` in movie-detail with an inline message/toast; `via.placeholder.com` is dead — use a local
    placeholder; rating display divides by 2 (10-point backend vs 5-star UI) — make this consistent; movie-detail still uses `*ngIf`.
11. **Tests:** `backend/movies/tests.py` is empty. Add APITestCase tests for register/login, movies CRUD permissions, reviews, watchlist.
    Angular `.spec.ts` files are probably stale after refactors — fix or keep them minimal so `ng test` passes.
12. **README**: replace "(Planned)" sections with the real endpoints and setup steps (incl. migrate + seed_movies).

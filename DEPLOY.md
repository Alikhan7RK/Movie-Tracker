# 🚀 Deploying CineTrack for free

This guide puts the app on the internet with three free services:

| Part | Service | What it does |
|---|---|---|
| Database | **Neon** (neon.com) | PostgreSQL database in the cloud |
| Backend (Django API) | **Render** (render.com) | Runs `gunicorn` with the Django app |
| Frontend (Angular) | **Netlify** (netlify.com) | Hosts the built Angular files |

```
Browser ──> Netlify (Angular)  ──API calls──>  Render (Django)  ──>  Neon (PostgreSQL)
```

Do the steps **in this order**: database → backend → frontend → connect them. It takes about 30 minutes.
You need: the project pushed to your GitHub account, and Python installed locally (only for step 2).

> ⚠️ Free plans change often. Everything here was checked in **November 2026**. Button names in the
> dashboards may be slightly different when you do it — look for the closest match.
> See [Free tier limits](#free-tier-limits) at the end for what "free" includes and what was uncertain.

---

## Step 1 — Create the database (Neon)

1. Go to **neon.com** → **Sign up** → choose **Continue with GitHub** (easiest).
2. Create a project (Neon asks for this on first login, or **New Project** on the dashboard):
   - **Project name:** `cinetrack`
   - **Postgres version:** leave the default
   - **Region:** pick one close to where you'll run the backend, e.g. **AWS Europe Central 1 (Frankfurt)**.
     You will choose the same area on Render (step 3).
   - Click **Create project**.
3. On the project dashboard click the **Connect** button.
4. In the window that opens, **turn OFF "Connection pooling"**.
   (Pooling is for apps with many connections; Django's migrations work more reliably on the direct connection.)
5. Copy the **connection string**. It looks like:
   ```
   postgresql://neondb_owner:AbC123xyz@ep-cool-name-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require
   ```
   Keep the `?sslmode=require...` part at the end. This string contains your database password —
   **never commit it to git**, only paste it into Render (step 3).

---

## Step 2 — Make a secret key

Django needs a long random secret in production. Run this on your computer and copy the output:

```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

(The key in `settings.py` is only for local development. It's public on GitHub, so the server refuses to
start with it when `DEBUG` is off.)

---

## Step 3 — Deploy the backend (Render)

1. Go to **render.com** → **Get Started** → **Sign up with GitHub**.
2. In the dashboard click **+ New** (top right) → **Web Service**.
3. Under **Git Provider** choose **GitHub**. If your repo is not in the list, click
   **Configure GitHub** / **Configure account**, allow Render to see the `Movie-Tracker` repository, and come back.
   Select **Movie-Tracker** → **Connect**.
4. Fill in the form:

   | Field | Value |
   |---|---|
   | **Name** | `movie-tracker-api` (this becomes the address `https://movie-tracker-api.onrender.com`; if the name is taken, Render adds letters — that's fine) |
   | **Language** | `Python 3` |
   | **Branch** | `main` |
   | **Region** | **Frankfurt (EU Central)** — or whatever is closest to your Neon region |
   | **Root Directory** | `backend` |
   | **Build Command** | `bash build.sh` |
   | **Start Command** | `gunicorn movie_tracker.wsgi:application` |
   | **Instance Type** | **Free** |

5. Scroll to **Environment Variables** and click **Add Environment Variable** for each row:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `SECRET_KEY` | the key from step 2 |
   | `PYTHON_VERSION` | `3.14.3` |
   | `DJANGO_SUPERUSER_USERNAME` | the admin login you want, e.g. `admin` |
   | `DJANGO_SUPERUSER_PASSWORD` | a strong password (this is your admin password!) |
   | `DJANGO_SUPERUSER_EMAIL` | your email (optional) |
   | `TMDB_API_KEY` | optional: your TMDB key, for the admin "Import from TMDB" page (see below) |

   You do **not** need to set `DEBUG` or `ALLOWED_HOSTS`: on Render, `DEBUG` is off automatically and
   Render's own address is allowed automatically (see `settings.py`).
   `CORS_ALLOWED_ORIGINS` is added later, in step 6, once you know the Netlify address.

6. Click **Deploy Web Service**. The **Logs** tab shows what's happening. The first deploy takes a few minutes.
   `build.sh` installs the packages, collects the admin CSS, creates the tables, adds 8 sample movies and creates your admin.
   You should see lines like:
   ```
   Applying movies.0006_movie_base_rating... OK
   create_admin: admin user "admin" created.
   ==> Your service is live 🎉
   ```
7. Test it — open these in your browser (use your real address from the top of the Render page):
   - `https://movie-tracker-api.onrender.com/api/movies/` → JSON with `"count": 8`
   - `https://movie-tracker-api.onrender.com/admin/` → the Django admin login page, **with** styling.
     Log in with the admin username/password from the table above.

### How the admin user is created (and why this way)
The free Render plan does **not** give you a terminal on the server (SSH isn't available for free services),
so you can't type `python manage.py createsuperuser` there. Instead, `build.sh` runs
`python manage.py create_admin`, which creates the admin from the `DJANGO_SUPERUSER_*` variables.
It's safe on every deploy: if the user already exists, it does nothing (it never resets the password).

- **Change the admin password later:** log in on the website → Profile → **Change password**.
  (Changing `DJANGO_SUPERUSER_PASSWORD` on Render does *not* change an existing user.)
- **Alternative — create users from your own computer:** point your local Django at the Neon database
  for one command (PowerShell):
  ```powershell
  cd backend
  $env:DATABASE_URL = "postgresql://...your Neon string..."
  python manage.py createsuperuser
  Remove-Item Env:DATABASE_URL      # back to the local SQLite database
  ```
  (macOS/Linux: `DATABASE_URL="postgresql://..." python manage.py createsuperuser`)

---

## Step 4 — Tell the frontend where the backend is

1. Open `frontend/src/environments/environment.ts` and set `apiUrl` to **your** Render address + `/api`:
   ```ts
   apiUrl: 'https://movie-tracker-api.onrender.com/api'
   ```
   (If your Render name is exactly `movie-tracker-api`, it's already correct.)
2. Commit and push:
   ```bash
   git add frontend/src/environments/environment.ts
   git commit -m "chore: set production API URL"
   git push
   ```
   Local development is not affected: `ng serve` uses `environment.development.ts` (localhost).

---

## Step 5 — Deploy the frontend (Netlify)

1. Go to **netlify.com** → **Sign up** → **Sign up with GitHub**.
2. In the dashboard: **Add new project** → **Import an existing project**
   (older accounts may say **Add new site** instead of *project*).
3. Choose **GitHub**, authorize Netlify, and pick the **Movie-Tracker** repository.
4. Netlify reads `netlify.toml` from the repo, so the fields are filled in for you. Check they say:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist/movie-tracker-frontend/browser`
5. Give it a **project name**, e.g. `cinetrack` → your site will be `https://cinetrack.netlify.app`
   (you can also change it later in **Project configuration → Change project name**).
6. Click **Deploy**. After 1–2 minutes the site is published. Copy its address.

---

## Step 6 — Connect frontend and backend (CORS)

The browser only lets the Netlify site call your API if the API allows that address.

1. On Render: open your **movie-tracker-api** service → **Environment** → **Add Environment Variable**:

   | Key | Value |
   |---|---|
   | `CORS_ALLOWED_ORIGINS` | `https://cinetrack.netlify.app` |

   Use **your** Netlify address, starting with `https://` and **without** a `/` at the end.
   Several addresses? Separate them with commas.
2. Click **Save, rebuild, and deploy** (or **Save changes** and then **Manual Deploy → Deploy latest commit**).

---

## Step 7 — Check that everything works

Open your Netlify address and:

- [ ] The movie list shows the 8 sample movies (the **first** visit can take ~1 minute — see below)
- [ ] Register a new user, log in, add a movie to the watchlist, write a review
- [ ] Log in as the admin → **+ Add movie** appears, and you can edit/delete movies
- [ ] Refresh the page on `/movies/1` → it still works (that's the redirect rule in `netlify.toml`)

**Why is the first load slow?** Free Render services go to sleep after 15 minutes without visitors.
The next request wakes them up, which takes about a minute. The Neon database also sleeps after
5 minutes and wakes up in a moment. This is normal on free plans.

---

## Updating the live site

Just `git push` to `main`:

- **GitHub Actions** runs all tests and the build (badge in README, details in the **Actions** tab).
- **Render** rebuilds the backend automatically (runs `build.sh` again → new migrations are applied).
- **Netlify** rebuilds the frontend automatically.

> Note: Render and Netlify deploy on push even if the CI tests fail. Check the badge, or on Render set
> **Settings → Auto-Deploy** to **After CI Checks Pass** if your plan shows that option.

---

## Troubleshooting

| Problem | Cause / fix |
|---|---|
| Render build fails with `Set the SECRET_KEY environment variable` | `SECRET_KEY` is missing on Render (step 3.5). |
| Render build fails at `migrate` with a connection error | `DATABASE_URL` is wrong — copy it again from Neon (step 1), including `?sslmode=require`. |
| Render build uses the wrong Python / `Django requires Python 3.12+` | Check `PYTHON_VERSION` is `3.14.3`. |
| `Bad Request (400)` when opening the API | Wrong address. Render's own `*.onrender.com` address is allowed automatically; a custom domain must be added to an `ALLOWED_HOSTS` variable. |
| Site loads but shows "Cannot connect to server" / "Failed to load movies" | Open the browser console (F12). A **CORS** error means `CORS_ALLOWED_ORIGINS` on Render doesn't exactly match the Netlify address (step 6). Otherwise check `apiUrl` in `environment.ts` (step 4) and that the backend is live. |
| "Page not found" after refreshing a page on Netlify | `netlify.toml` must be in the repository root (it is, unless it was deleted). |
| Admin panel has no styling | `collectstatic` didn't run — look for it in the Render build log. |
| Netlify site shows "Site paused" / "usage exceeded" | The free credits for this month are used up (see below). |

---

## Free tier limits

What the free plans include (checked November 2026; the ⚠️ items were unclear or sources disagreed,
so confirm on the pricing pages before relying on them).

### Render (backend)
- Free web services **sleep after 15 minutes** without traffic; waking up takes **about 1 minute**.
- **750 free instance hours per month per workspace** — enough for one service running all month.
  If the hours run out, free services are suspended until next month.
- 512 MB RAM, 0.1 CPU. Files written to the server's disk are lost on every deploy/restart
  (fine for us: all data is in Neon).
- **No SSH on free services** — that's why the admin is created by `build.sh` (see step 3).
- ⚠️ Whether the dashboard **Shell** tab and **Pre-Deploy Command** are available on free services wasn't
  clear from Render's docs, so this guide doesn't depend on them (migrations run in `build.sh`).
- Render also offers its own free PostgreSQL, but ⚠️ free Render databases have historically been
  **deleted after a limited time** (30 days at the time of writing), so Neon is the safer choice for data you want to keep.

### Neon (database)
- **100 CU-hours of compute per project per month**, then compute pauses until next month.
  A small app like this uses far less, because the database **sleeps after 5 minutes** of no queries
  (can't be turned off on Free) and sleeping doesn't count.
- ⚠️ **Storage: 0.5 GB per project** according to the newest sources (older pages say 1 GB).
  Either is plenty for this app.
- 5 GB of network transfer per project per month.

### Netlify (frontend)
- ⚠️ Accounts created **after 4 September 2025** use **credits**: the Free plan has **300 credits per month**.
  Reported prices: **15 credits per production deploy**, 20 credits per GB of bandwidth.
  So roughly **20 deploys a month** if bandwidth is small. When credits run out, the site **pauses** until next month.
  These numbers come from third-party write-ups; check **netlify.com/pricing**.
- Older accounts keep the old limits (100 GB bandwidth, 300 build minutes/month).
- Every push to `main` is a production deploy. If you push a lot, you can turn off automatic deploys
  (**Project configuration → Build & deploy → Continuous deployment → Stop builds**) and click
  **Deploys → Trigger deploy** only when you want to publish.
- **Alternative without credits:** Render can also host the frontend for free as a **Static Site**
  (**+ New → Static Site**, Root Directory `frontend`, Build Command `npm ci && npm run build`,
  Publish Directory `dist/movie-tracker-frontend/browser`, and add a **Rewrite** rule `/*` → `/index.html`
  under **Redirects/Rewrites**). Then use that address in `CORS_ALLOWED_ORIGINS` instead.

---

## TMDB key (optional, for "Import from TMDB")

1. Create a free account on **themoviedb.org**, then open your avatar → **Settings** → **API**.
2. Request an API key (choose the free personal/developer use) and copy either the **API Key** or the
   **API Read Access Token** — both work.
3. On Render: your service → **Environment** → add `TMDB_API_KEY` → **Save, rebuild, and deploy**.
   Locally: copy `backend/.env.example` to `backend/.env` and paste the key there.

Never commit the key: `backend/.env` is git-ignored. Without a key everything else works; only the import page
shows "TMDB_API_KEY is not set on the server".
TMDB's free API is for non-commercial use and asks apps to show an attribution — the import page does this.

---

## Environment variables reference (backend)

| Variable | Needed on Render? | Default when not set (local) | Meaning |
|---|---|---|---|
| `DATABASE_URL` | ✅ | local `db.sqlite3` | PostgreSQL connection string |
| `SECRET_KEY` | ✅ | public dev key (refused when `DEBUG` is off) | Django's secret |
| `TMDB_API_KEY` | optional | empty (TMDB import disabled) | The Movie Database v3 key or v4 read token |
| `CORS_ALLOWED_ORIGINS` | ✅ (step 6) | `http://localhost:4200` | Frontend addresses, comma-separated |
| `DJANGO_SUPERUSER_USERNAME` / `_PASSWORD` / `_EMAIL` | for the first admin | — (skipped) | Used by `create_admin` in `build.sh` |
| `PYTHON_VERSION` | recommended | Render's default | Python version for Render |
| `DEBUG` | no | `True` locally, `False` on Render | Never `True` in production |
| `ALLOWED_HOSTS` | only for a custom domain | Render address is added automatically | Hostnames the API answers to |
| `SECURE_SSL_REDIRECT` | no | `True` when `DEBUG` is off | Redirect HTTP to HTTPS |

#!/usr/bin/env bash
# Render runs this on every deploy (Build Command: bash build.sh). See DEPLOY.md.
# Stop at the first error, so a broken migration never goes live.
set -o errexit

pip install -r requirements.txt

# Copy admin panel CSS/JS into staticfiles/ for WhiteNoise
python manage.py collectstatic --no-input

# Create / update the database tables
python manage.py migrate --no-input

# Sample genres and movies (safe to run again: existing movies are not duplicated)
python manage.py seed_movies

# Admin account from DJANGO_SUPERUSER_* variables (skipped if they are not set or the user exists)
python manage.py create_admin

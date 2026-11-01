"""Small client for The Movie Database (TMDB) API, used by the admin "Import from TMDB" page.

All requests go through _get(), so tests can replace that one function and never touch the network.
Uses only the standard library (urllib), no extra packages.
"""
import json
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings
from django.db import transaction

from .models import Genre, Movie

API_BASE = 'https://api.themoviedb.org/3'
IMAGE_BASE = 'https://image.tmdb.org/t/p'
POSTER_SIZE = 'w500'      # same size as the seeded posters
BACKDROP_SIZE = 'w1280'   # wide image for the banner / movie page background
TIMEOUT_SECONDS = 10
TOP_ACTORS = 5


class TmdbError(Exception):
    """Something went wrong with TMDB; `status` is the HTTP status our API should answer with."""

    def __init__(self, message, status=502):
        super().__init__(message)
        self.status = status


def _get(path, params=None):
    # One GET request to the TMDB API; returns the parsed JSON
    key = settings.TMDB_API_KEY
    if not key:
        raise TmdbError('TMDB_API_KEY is not set on the server (see .env.example / DEPLOY.md).', status=503)

    params = dict(params or {})
    headers = {'Accept': 'application/json'}
    if key.startswith('eyJ'):
        # v4 "API Read Access Token" (a long JWT) goes in the header
        headers['Authorization'] = f'Bearer {key}'
    else:
        # v3 "API Key" (32 characters) goes in the URL
        params['api_key'] = key

    url = f'{API_BASE}{path}?{urlencode(params)}'
    try:
        with urlopen(Request(url, headers=headers), timeout=TIMEOUT_SECONDS) as response:
            return json.loads(response.read().decode('utf-8'))
    except HTTPError as error:
        if error.code == 404:
            raise TmdbError('Movie not found on TMDB.', status=404)
        if error.code == 401:
            raise TmdbError('TMDB rejected the API key. Check TMDB_API_KEY.', status=502)
        raise TmdbError(f'TMDB answered with error {error.code}. Try again later.', status=502)
    except (URLError, TimeoutError, ValueError):
        raise TmdbError('Could not reach TMDB. Try again later.', status=502)


def image_url(path, size):
    # "/abc.jpg" -> "https://image.tmdb.org/t/p/w500/abc.jpg"; no path -> None
    return f'{IMAGE_BASE}/{size}{path}' if path else None


def _year(release_date):
    # "2014-11-05" -> 2014; "" or None -> None
    try:
        return int((release_date or '')[:4])
    except ValueError:
        return None


def search_movies(query):
    # First page of TMDB search results (up to 20), in a short format for the import page
    data = _get('/search/movie', {'query': query, 'include_adult': 'false', 'language': 'en-US'})
    return [
        {
            'tmdb_id': item['id'],
            'title': item.get('title') or item.get('original_title') or '',
            'year': _year(item.get('release_date')),
            'overview': item.get('overview') or '',
            'poster_url': image_url(item.get('poster_path'), POSTER_SIZE),
            'rating': round(item.get('vote_average') or 0, 1),
        }
        for item in data.get('results', [])
    ]


def _pick_trailer(videos):
    # Best YouTube video: official trailer > any trailer > teaser
    youtube = [v for v in videos if v.get('site') == 'YouTube' and v.get('key')]
    for wanted in (
        lambda v: v.get('type') == 'Trailer' and v.get('official'),
        lambda v: v.get('type') == 'Trailer',
        lambda v: v.get('type') == 'Teaser',
    ):
        for video in youtube:
            if wanted(video):
                return f"https://www.youtube.com/watch?v={video['key']}"
    return None


def movie_details(tmdb_id):
    # Everything we store about a movie, from one TMDB request (details + credits + videos)
    data = _get(f'/movie/{tmdb_id}', {'append_to_response': 'credits,videos', 'language': 'en-US'})
    credits = data.get('credits') or {}

    directors = [p['name'] for p in credits.get('crew', []) if p.get('job') == 'Director']
    cast = sorted(credits.get('cast', []), key=lambda p: p.get('order', 999))
    countries = [c['name'] for c in data.get('production_countries', [])]

    return {
        'title': (data.get('title') or data.get('original_title') or '')[:255],
        'description': data.get('overview') or '',
        'year': _year(data.get('release_date')),
        'poster_url': image_url(data.get('poster_path'), POSTER_SIZE),
        'backdrop_url': image_url(data.get('backdrop_path'), BACKDROP_SIZE),
        'director': ', '.join(directors)[:255],
        'actors': ', '.join(p['name'] for p in cast[:TOP_ACTORS]),
        'country': ', '.join(countries)[:100],
        'duration': data.get('runtime') or None,
        'genres': [g['name'] for g in data.get('genres', [])],
        'trailer_url': _pick_trailer((data.get('videos') or {}).get('results', [])),
        'base_rating': Decimal(str(round(data.get('vote_average') or 0, 1))),
    }


@transaction.atomic
def import_movie(tmdb_id):
    # Create or update our Movie from TMDB. Returns (movie, created).
    details = movie_details(tmdb_id)
    if not details['year']:
        raise TmdbError('This movie has no release date on TMDB, so it cannot be imported yet.', status=400)

    movie = Movie.objects.filter(tmdb_id=tmdb_id).first()
    if movie is None:
        # A movie added by hand or by seed_movies with the same title and year: link it instead of making a copy
        movie = Movie.objects.filter(tmdb_id__isnull=True, title__iexact=details['title'], year=details['year']).first()
    created = movie is None
    if created:
        movie = Movie(content_type='movie')

    genre_names = details.pop('genres')
    for field, value in details.items():
        setattr(movie, field, value)
    movie.tmdb_id = tmdb_id
    movie.save()

    # Genres come from TMDB; missing ones are created
    movie.genres.set([Genre.objects.get_or_create(name=name)[0] for name in genre_names])

    # rating = average of our reviews, or the TMDB rating (base_rating) when there are none
    movie.update_rating()
    return movie, created

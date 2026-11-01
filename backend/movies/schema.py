"""Shapes used only by the API docs (/api/docs/).

Most views here are plain APIView / @api_view, so drf-spectacular can't guess what they
return. These small serializers describe those responses; they are never used to validate data.
"""
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes
from rest_framework import serializers

from .serializers import MovieSerializer


class MessageSerializer(serializers.Serializer):
    message = serializers.CharField()


class ErrorSerializer(serializers.Serializer):
    error = serializers.CharField()


class RegisterResponseSerializer(serializers.Serializer):
    message = serializers.CharField()
    user_id = serializers.IntegerField()
    username = serializers.CharField()


class TokenPairSerializer(serializers.Serializer):
    message = serializers.CharField()
    access = serializers.CharField(help_text='Send as "Authorization: Bearer <access>". Valid for 1 day.')
    refresh = serializers.CharField(help_text='Use with POST /api/token/refresh/ to get a new access token. Valid for 7 days.')


class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class ProfileReviewSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    movie = serializers.IntegerField()
    movie_title = serializers.CharField()
    text = serializers.CharField()
    stars = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class ProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField()
    is_staff = serializers.BooleanField(help_text='True for admins (can add, edit and delete movies).')
    reviews = ProfileReviewSerializer(many=True)


class MoviePageSerializer(serializers.Serializer):
    count = serializers.IntegerField(help_text='Movies matching the filters, on all pages.')
    total_pages = serializers.IntegerField()
    next = serializers.URLField(allow_null=True)
    previous = serializers.URLField(allow_null=True)
    results = MovieSerializer(many=True)


MOVIE_LIST_PARAMETERS = [
    OpenApiParameter('page', OpenApiTypes.INT, description='Page number (12 movies per page).'),
    OpenApiParameter('search', OpenApiTypes.STR, description='Text in the title, director or actors (case-insensitive).'),
    OpenApiParameter('genre', OpenApiTypes.INT, description='Genre id from /api/genres/.'),
    OpenApiParameter('content_type', OpenApiTypes.STR, enum=['movie', 'series', 'cartoon', 'anime']),
    OpenApiParameter(
        'ordering', OpenApiTypes.STR,
        enum=['rating', '-rating', 'year', '-year', 'title', '-title', 'created_at', '-created_at'],
        description="Sort field; '-' in front = descending. Default: -created_at (newest added first).",
    ),
]


class TmdbSearchResultSerializer(serializers.Serializer):
    tmdb_id = serializers.IntegerField()
    title = serializers.CharField()
    year = serializers.IntegerField(allow_null=True)
    overview = serializers.CharField()
    poster_url = serializers.URLField(allow_null=True)
    rating = serializers.FloatField(help_text='TMDB average vote, out of 10.')
    imported_movie_id = serializers.IntegerField(
        allow_null=True, help_text='Our movie id if this TMDB movie was already imported, otherwise null.'
    )

from django.urls import path
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register_view,
    login_view,
    profile_view,
    change_password_view,
    genre_list_view,
    LogoutView,
    MovieListCreateView,
    MovieDetailView,
    ReviewListCreateView,
    ReviewDetailView,
    WatchlistListCreateView,
    WatchlistDetailView,
    TmdbSearchView,
    TmdbImportView,
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('profile/', profile_view, name='profile'),
    path('profile/password/', change_password_view, name='change-password'),
    path('logout/', LogoutView.as_view(), name='logout'),
    # {"refresh": "..."} -> {"access": "..."}; used by the Angular interceptor when the access token expires
    path('token/refresh/', extend_schema_view(post=extend_schema(
        tags=['Auth'],
        summary='Get a new access token',
        description='Send the `refresh` token from login. Fails (401) after logout or when the refresh token expired.',
    ))(TokenRefreshView).as_view(), name='token-refresh'),

    path('genres/', genre_list_view, name='genre-list'),

    path('movies/', MovieListCreateView.as_view(), name='movie-list-create'),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name='movie-detail'),

    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),

    path('watchlist/', WatchlistListCreateView.as_view(), name='watchlist-list-create'),
    path('watchlist/<int:pk>/', WatchlistDetailView.as_view(), name='watchlist-detail'),

    # Admin: import movies from The Movie Database
    path('tmdb/search/', TmdbSearchView.as_view(), name='tmdb-search'),
    path('tmdb/import/', TmdbImportView.as_view(), name='tmdb-import'),
]
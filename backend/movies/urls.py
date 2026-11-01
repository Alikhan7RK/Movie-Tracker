from django.urls import path
from .views import (
    register_view,
    login_view,
    profile_view,
    genre_list_view,
    LogoutView,
    MovieListCreateView,
    MovieDetailView,
    ReviewListCreateView,
    ReviewDetailView,
    WatchlistListCreateView,
    WatchlistDetailView,
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('profile/', profile_view, name='profile'),
    path('logout/', LogoutView.as_view(), name='logout'),

    path('genres/', genre_list_view, name='genre-list'),

    path('movies/', MovieListCreateView.as_view(), name='movie-list-create'),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name='movie-detail'),

    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
    path('reviews/<int:pk>/', ReviewDetailView.as_view(), name='review-detail'),

    path('watchlist/', WatchlistListCreateView.as_view(), name='watchlist-list-create'),
    path('watchlist/<int:pk>/', WatchlistDetailView.as_view(), name='watchlist-detail'),
]
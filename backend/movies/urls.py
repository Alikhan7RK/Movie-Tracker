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
    WatchlistListCreateView,
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
    path('watchlist/', WatchlistListCreateView.as_view(), name='watchlist-list-create'),
]
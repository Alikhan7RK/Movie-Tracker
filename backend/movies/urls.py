from django.urls import path
from .views import LogoutView
from .views import (
    register_view,
    login_view,
    profile_view,
    logout_view,
    MovieListCreateView,
    MovieDetailView,
    ReviewListCreateView,
    WatchlistListCreateView,
)

urlpatterns = [
    path('register/', register_view, name='register'),
    path('login/', login_view, name='login'),
    path('profile/', profile_view, name='profile'),

    path('logout/', LogoutView.as_view()),

    path('movies/', MovieListCreateView.as_view(), name='movie-list-create'),
    path('movies/<int:pk>/', MovieDetailView.as_view(), name='movie-detail'),

    path('reviews/', ReviewListCreateView.as_view(), name='review-list-create'),
    path('watchlist/', WatchlistListCreateView.as_view(), name='watchlist-list-create'),
]
from django.contrib import admin
from .models import Genre, Movie, Review, Watchlist


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name')
    search_fields = ('name',)


@admin.register(Movie)
class MovieAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'year', 'rating', 'content_type')
    list_filter = ('content_type', 'year', 'genres')
    search_fields = ('title', 'description')
    filter_horizontal = ('genres',)


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'movie', 'stars', 'created_at')
    list_filter = ('stars', 'created_at')
    search_fields = ('user__username', 'movie__title')


@admin.register(Watchlist)
class WatchlistAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'movie', 'status', 'added_at')
    list_filter = ('status',)
    search_fields = ('user__username', 'movie__title')
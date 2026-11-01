from django.db import models
from django.db.models import Avg
from django.contrib.auth.models import User

# Create your models here.

class Genre(models.Model):
    name = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return self.name


class Movie(models.Model):
    CONTENT_TYPES = [
        ('movie', 'Movie'),
        ('series', 'Series'),
        ('cartoon', 'Cartoon'),
        ('anime', 'Anime'),
    ]

    title = models.CharField(max_length=255)
    description = models.TextField()
    year = models.PositiveIntegerField()
    # rating is what users see: average of reviews, or base_rating when there are no reviews
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    # The movie's original rating (out of 10), set by an admin or by seed_movies
    base_rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    trailer_url = models.URLField(blank=True, null=True)
    poster_url = models.URLField(blank=True, null=True)
    # Wide (16:9) image for the movie list banner and the movie page background; the poster is used when empty
    backdrop_url = models.URLField(blank=True, null=True)
    # The movie's id on themoviedb.org, set by the TMDB import; unique, so the same movie is never imported twice
    tmdb_id = models.PositiveIntegerField(unique=True, blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='movie')
    director = models.CharField(max_length=255, blank=True, default='')
    actors = models.TextField(blank=True, default='')
    country = models.CharField(max_length=100, blank=True, default='')
    duration = models.PositiveIntegerField(blank=True, null=True, help_text='Length in minutes')
    genres = models.ManyToManyField(Genre, related_name='movies', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.year})"

    def update_rating(self):
        # Rating = average of review stars (1-5) converted to the 10-point scale (stars * 2).
        # No reviews -> fall back to the original base_rating.
        average_stars = self.reviews.aggregate(avg=Avg('stars'))['avg']
        if average_stars is not None:
            self.rating = round(average_stars * 2, 1)
        else:
            self.rating = self.base_rating
        self.save(update_fields=['rating'])


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    text = models.TextField()
    stars = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        # One review per user per movie
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"Review by {self.user.username} for {self.movie.title}"


class Watchlist(models.Model):
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('watching', 'Watching'),
        ('completed', 'Completed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='watchlist')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='watchlist_entries')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='planned')
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'movie')

    def __str__(self):
        return f"{self.user.username} - {self.movie.title} ({self.status})"

from django.db import models
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
    rating = models.DecimalField(max_digits=3, decimal_places=1, default=0.0)
    trailer_url = models.URLField(blank=True, null=True)
    poster_url = models.URLField(blank=True, null=True)
    content_type = models.CharField(max_length=20, choices=CONTENT_TYPES, default='movie')
    genres = models.ManyToManyField(Genre, related_name='movies', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({self.year})"


class Review(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reviews')
    movie = models.ForeignKey(Movie, on_delete=models.CASCADE, related_name='reviews')
    text = models.TextField()
    stars = models.PositiveSmallIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

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

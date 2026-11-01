import { Component, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { RatingPipe } from '../../../shared/rating.pipe';
import { getYoutubeId, youtubeEmbedUrl } from '../../../shared/youtube';
import { backdropImage, usesPosterAsBackdrop } from '../../../shared/backdrop';
import { MovieService } from '../../../services/movie.service';
import { ReviewService } from '../../../services/review.service';
import { WatchlistService } from '../../../services/watchlist.service';
import { AuthService } from '../../../services/auth.service';
import { Movie } from '../../../models/movie.model';
import { Review } from '../../../models/review.model';
import { WATCHLIST_STATUSES, WatchlistItem } from '../../../models/watchlist.model';

// Inline message shown on the page instead of alert()
interface PageMessage {
  type: 'success' | 'error';
  text: string;
}

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, RatingPipe],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetail {
  backdropImage = backdropImage;
  usesPosterAsBackdrop = usesPosterAsBackdrop;

  movieId = 0;
  movie = signal<Movie | null>(null);
  loading = signal(true);
  error = signal('');

  reviews = signal<Review[]>([]);
  reviewsError = signal('');
  reviewMessage = signal<PageMessage | null>(null);
  submitting = signal(false);

  // The watchlist entry for this movie, or null if it is not in my watchlist
  watchlistItem = signal<WatchlistItem | null>(null);
  watchlistMessage = signal<PageMessage | null>(null);

  // Review form fields (changed by clicks/typing, so plain fields are fine here)
  rating = 0;
  comment = '';

  isLoggedIn = false;
  isAdmin = false;
  username = '';

  // Admin delete: first click shows "Are you sure?", second click really deletes
  confirmingDelete = signal(false);
  deleting = signal(false);
  deleteError = signal('');

  // Safe YouTube embed link for the iframe, or null if there is no YouTube trailer
  trailerEmbedUrl = computed<SafeResourceUrl | null>(() => {
    const id = getYoutubeId(this.movie()?.trailer_url);
    // Angular blocks unknown URLs in iframes. We only mark as trusted a URL we built ourselves
    // from a checked 11-character video id, so nothing from the user goes into it directly.
    return id ? this.sanitizer.bypassSecurityTrustResourceUrl(youtubeEmbedUrl(id)) : null;
  });

  // The current user's own review of this movie (if any)
  myReview = computed(() => this.reviews().find(r => r.user === this.username) ?? null);

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService,
    private reviewService: ReviewService,
    private watchlistService: WatchlistService,
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.movieId = Number(this.route.snapshot.paramMap.get('id'));
    this.isLoggedIn = this.authService.isLoggedIn();
    this.isAdmin = this.authService.isAdmin();
    this.username = this.authService.getUsername();

    this.loadMovie();
    this.loadReviews();

    if (this.isLoggedIn) {
      this.loadWatchlistItem();
    }
  }

  loadMovie() {
    this.movieService.getMovie(this.movieId).subscribe({
      next: (movie) => {
        this.movie.set(movie);
        this.loading.set(false);
      },
      error: (err) => {
        if (err.status === 404) {
          this.error.set('Movie not found.');
        } else if (err.status === 0) {
          this.error.set('Cannot connect to server. Make sure the backend is running on port 8000.');
        } else {
          this.error.set('Failed to load movie.');
        }
        this.loading.set(false);
      }
    });
  }

  loadReviews() {
    this.reviewService.getReviews(this.movieId).subscribe({
      next: (reviews) => {
        this.reviews.set(reviews);
        this.reviewsError.set('');

        // If I already reviewed this movie, put my review into the form so I can edit it
        const mine = this.myReview();
        if (mine && !this.comment && !this.rating) {
          this.comment = mine.text;
          this.rating = mine.stars;
        }
      },
      error: () => this.reviewsError.set('Failed to load reviews.')
    });
  }

  loadWatchlistItem() {
    this.watchlistService.getWatchlist().subscribe({
      next: (items) => {
        this.watchlistItem.set(items.find(item => item.movie === this.movieId) ?? null);
      }
    });
  }

  get genreNames(): string {
    return this.movie()?.genres.map(g => g.name).join(', ') ?? '';
  }

  statusLabel(status: string): string {
    return WATCHLIST_STATUSES.find(s => s.value === status)?.label ?? status;
  }

  // 4 -> "★★★★☆"
  starsText(stars: number): string {
    return '★'.repeat(stars) + '☆'.repeat(5 - stars);
  }

  setRating(value: number) {
    this.rating = value;
  }

  submitReview() {
    if (!this.rating || !this.comment.trim()) {
      this.reviewMessage.set({ type: 'error', text: 'Please choose 1–5 stars and write a comment.' });
      return;
    }

    this.submitting.set(true);
    this.reviewMessage.set(null);

    this.reviewService.addReview(this.movieId, this.comment.trim(), this.rating).subscribe({
      next: () => {
        this.submitting.set(false);
        this.reviewMessage.set({ type: 'success', text: 'Your review was saved.' });
        // Reload reviews and the movie, because the backend recalculated the rating
        this.loadReviews();
        this.loadMovie();
      },
      error: (err) => {
        this.submitting.set(false);
        this.reviewMessage.set({
          type: 'error',
          text: err.status === 401 ? 'Your session expired. Please log in again.' : 'Failed to save your review.'
        });
      }
    });
  }

  deleteReview(review: Review) {
    this.reviewService.deleteReview(review.id).subscribe({
      next: () => {
        this.comment = '';
        this.rating = 0;
        this.reviewMessage.set({ type: 'success', text: 'Your review was deleted.' });
        this.loadReviews();
        this.loadMovie();
      },
      error: () => {
        this.reviewMessage.set({ type: 'error', text: 'Failed to delete your review.' });
      }
    });
  }

  deleteMovie() {
    this.deleting.set(true);
    this.deleteError.set('');

    this.movieService.deleteMovie(this.movieId).subscribe({
      next: () => this.router.navigate(['/movies']),
      error: (err) => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
        this.deleteError.set(err.status === 403 ? 'Only admins can delete movies.' : 'Failed to delete the movie.');
      }
    });
  }

  addToWatchlist() {
    this.watchlistMessage.set(null);

    this.watchlistService.addToWatchlist(this.movieId).subscribe({
      next: (item) => {
        this.watchlistItem.set(item);
        this.watchlistMessage.set({ type: 'success', text: 'Movie added to your watchlist!' });
      },
      error: (err) => {
        let text = 'Failed to add movie to watchlist.';
        if (err.status === 400 && err.error?.movie) {
          text = err.error.movie[0] || err.error.movie;
        } else if (err.status === 401) {
          text = 'You need to log in first.';
        }
        this.watchlistMessage.set({ type: 'error', text });
      }
    });
  }
}

import { Component, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { RatingPipe } from '../../../shared/rating.pipe';
import { MovieService } from '../../../services/movie.service';
import { WatchlistService } from '../../../services/watchlist.service';
import { Movie } from '../../../models/movie.model';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, RatingPipe],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetail {
  movie = signal<Movie | null>(null);
  loading = signal(true);
  error = signal('');

  rating = 0;
  comment = '';
  comments: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService,
    private watchlistService: WatchlistService
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));

    this.movieService.getMovie(id).subscribe({
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

  get genreNames(): string {
    return this.movie()?.genres.map(g => g.name).join(', ') ?? '';
  }

  setRating(value: number) {
    this.rating = value;
  }

  addComment() {
    if (!this.comment || !this.rating) return;

    this.comments.push({
      text: this.comment,
      rating: this.rating
    });

    this.comment = '';
    this.rating = 0;
  }
  addToWatchlist() {
    const movie = this.movie();
    if (!movie) return;

    this.watchlistService.addToWatchlist(movie.id).subscribe({
      next: () => {
        alert('Movie added to watchlist!');
      },
      error: (err) => {
        if (err.status === 400 && err.error?.movie) {
          alert(err.error.movie[0] || err.error.movie);
        } else if (err.status === 401) {
          alert('You need to log in first.');
        } else {
         alert('Failed to add movie to watchlist.');
        }
      }
    });
  }
}

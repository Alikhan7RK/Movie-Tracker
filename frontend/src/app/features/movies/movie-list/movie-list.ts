import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieCard } from '../../../shared/movie-card/movie-card';
import { MovieService } from '../../../services/movie.service';
import { AuthService } from '../../../services/auth.service';
import { CONTENT_TYPES, Genre, Movie } from '../../../models/movie.model';

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, MovieCard],
  templateUrl: './movie-list.html',
  styleUrl: './movie-list.css'
})
export class MovieList {
  search = '';
  selectedGenre = '';
  selectedType = '';

  contentTypes = CONTENT_TYPES;
  isAdmin = false;

  // Signals: when their value changes, Angular redraws the page
  // (this app has no zone.js, so plain fields set inside subscribe() would not update the view)
  movies = signal<Movie[]>([]);
  genres = signal<Genre[]>([]);
  loading = signal(true);
  error = signal('');

  constructor(private movieService: MovieService, private authService: AuthService) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.loadMovies();

    // If genres fail to load, the page still works, the filter is just empty
    this.movieService.getGenres().subscribe({
      next: (genres) => this.genres.set(genres)
    });
  }

  loadMovies() {
    this.loading.set(true);
    this.error.set('');

    this.movieService.getMovies().subscribe({
      next: (movies) => {
        this.movies.set(movies);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.status === 0
            ? 'Cannot connect to server. Make sure the backend is running on port 8000.'
            : 'Failed to load movies.'
        );
        this.loading.set(false);
      }
    });
  }

  get filteredMovies(): Movie[] {
    const search = this.search.toLowerCase();

    return this.movies().filter(m =>
      m.title.toLowerCase().includes(search) &&
      (this.selectedGenre ? m.genres.some(g => g.name === this.selectedGenre) : true) &&
      (this.selectedType ? m.content_type === this.selectedType : true)
    );
  }
}

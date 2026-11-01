import { CommonModule } from '@angular/common';
import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieCard } from '../../../shared/movie-card/movie-card';
import { MovieService } from '../../../services/movie.service';
import { AuthService } from '../../../services/auth.service';
import { CONTENT_TYPES, ContentType, Genre, MOVIE_ORDERINGS, Movie } from '../../../models/movie.model';

// Wait this long after the last key press before searching
const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar, MovieCard],
  templateUrl: './movie-list.html',
  styleUrl: './movie-list.css'
})
export class MovieList {
  search = '';
  selectedGenre: number | '' = '';
  selectedType: ContentType | '' = '';
  ordering = '';

  contentTypes = CONTENT_TYPES;
  orderings = MOVIE_ORDERINGS;
  isAdmin = false;

  // Signals: when their value changes, Angular redraws the page
  // (this app has no zone.js, so plain fields set inside subscribe() would not update the view)
  movies = signal<Movie[]>([]);
  genres = signal<Genre[]>([]);
  loading = signal(true);
  error = signal('');
  page = signal(1);
  totalPages = signal(1);
  totalCount = signal(0);

  // Page buttons around the current page, e.g. page 6 of 10 -> [4, 5, 6, 7, 8]
  pageNumbers = computed(() => {
    const first = Math.max(1, this.page() - 2);
    const last = Math.min(this.totalPages(), this.page() + 2);
    return Array.from({ length: last - first + 1 }, (_, i) => first + i);
  });

  private searchChanges = new Subject<string>();
  private request?: Subscription;
  private destroyRef = inject(DestroyRef);

  constructor(private movieService: MovieService, private authService: AuthService) {}

  ngOnInit() {
    this.isAdmin = this.authService.isAdmin();
    this.loadMovies();

    // If genres fail to load, the page still works, the filter is just empty
    this.movieService.getGenres().subscribe({
      next: (genres) => this.genres.set(genres)
    });

    // Search only when the user stops typing, not on every key press
    this.searchChanges
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.loadMovies(1));

    this.destroyRef.onDestroy(() => this.request?.unsubscribe());
  }

  onSearchChange(value: string) {
    this.searchChanges.next(value.trim());
  }

  // Genre, type or sorting changed -> start again from page 1
  onFiltersChange() {
    this.loadMovies(1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.page()) {
      return;
    }
    this.loadMovies(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  loadMovies(page = this.page()) {
    this.loading.set(true);
    this.error.set('');

    // A newer request replaces an older one that hasn't finished yet (e.g. fast typing)
    this.request?.unsubscribe();
    this.request = this.movieService
      .getMovies({
        page,
        search: this.search.trim(),
        genre: this.selectedGenre,
        content_type: this.selectedType,
        ordering: this.ordering
      })
      .subscribe({
        next: (result) => {
          this.movies.set(result.results);
          this.totalCount.set(result.count);
          this.totalPages.set(Math.max(1, result.total_pages));
          this.page.set(page);
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
}

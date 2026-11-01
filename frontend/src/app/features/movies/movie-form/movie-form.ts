import { Component, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieService } from '../../../services/movie.service';
import { CONTENT_TYPES, ContentType, Genre, MoviePayload } from '../../../models/movie.model';

// Same limits as MovieSerializer.validate_year in the backend
const MIN_YEAR = 1888;
const MAX_YEAR = new Date().getFullYear() + 5;

interface MovieFormData {
  title: string;
  description: string;
  year: number | null;
  base_rating: number | null;
  poster_url: string;
  backdrop_url: string;
  trailer_url: string;
  content_type: ContentType;
  director: string;
  actors: string;
  country: string;
  duration: number | null;
}

type FormErrors = Partial<Record<keyof MovieFormData, string>>;

// One form for both pages: /movies/new (create) and /movies/:id/edit (edit)
@Component({
  selector: 'app-movie-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navbar],
  templateUrl: './movie-form.html',
  styleUrl: './movie-form.css'
})
export class MovieForm {
  contentTypes = CONTENT_TYPES;
  minYear = MIN_YEAR;
  maxYear = MAX_YEAR;

  movieId: number | null = null; // null = creating a new movie

  form: MovieFormData = {
    title: '',
    description: '',
    year: null,
    base_rating: null,
    poster_url: '',
    backdrop_url: '',
    trailer_url: '',
    content_type: 'movie',
    director: '',
    actors: '',
    country: '',
    duration: null
  };
  selectedGenreIds: number[] = [];

  // Becomes true after the first click on Save; from then on errors are shown
  submitted = false;
  posterBroken = false;

  genres = signal<Genre[]>([]);
  loading = signal(false);
  loadError = signal('');
  saving = signal(false);
  saveError = signal('');
  // Field errors returned by the backend (400 response), e.g. { year: ['...'] }
  serverErrors = signal<Record<string, string[]>>({});

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private movieService: MovieService
  ) {}

  ngOnInit() {
    this.movieService.getGenres().subscribe({
      next: (genres) => this.genres.set(genres)
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.movieId = Number(id);
      this.loadMovie(this.movieId);
    }
  }

  get isEdit(): boolean {
    return this.movieId !== null;
  }

  loadMovie(id: number) {
    this.loading.set(true);

    this.movieService.getMovie(id).subscribe({
      next: (movie) => {
        // Copy the movie into the form fields
        this.form = {
          title: movie.title,
          description: movie.description,
          year: movie.year,
          base_rating: Number(movie.base_rating),
          poster_url: movie.poster_url ?? '',
          backdrop_url: movie.backdrop_url ?? '',
          trailer_url: movie.trailer_url ?? '',
          content_type: movie.content_type,
          director: movie.director,
          actors: movie.actors,
          country: movie.country,
          duration: movie.duration
        };
        this.selectedGenreIds = movie.genres.map(g => g.id);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err.status === 404 ? 'Movie not found.' : 'Failed to load movie.');
        this.loading.set(false);
      }
    });
  }

  // Checks every field and returns a message for each wrong one
  get errors(): FormErrors {
    const f = this.form;
    const errors: FormErrors = {};

    if (!f.title.trim()) errors.title = 'Title is required.';
    else if (f.title.length > 255) errors.title = 'Title must be at most 255 characters.';

    if (!f.description.trim()) errors.description = 'Description is required.';

    if (f.year === null) errors.year = 'Year is required.';
    else if (!Number.isInteger(f.year) || f.year < MIN_YEAR || f.year > MAX_YEAR) {
      errors.year = `Year must be a whole number between ${MIN_YEAR} and ${MAX_YEAR}.`;
    }

    if (f.base_rating !== null && (f.base_rating < 0 || f.base_rating > 10)) {
      errors.base_rating = 'Rating must be between 0 and 10.';
    }

    if (f.poster_url.trim() && !this.isValidUrl(f.poster_url)) {
      errors.poster_url = 'Enter a valid link starting with http:// or https://';
    }
    if (f.backdrop_url.trim() && !this.isValidUrl(f.backdrop_url)) {
      errors.backdrop_url = 'Enter a valid link starting with http:// or https://';
    }
    if (f.trailer_url.trim() && !this.isValidUrl(f.trailer_url)) {
      errors.trailer_url = 'Enter a valid link starting with http:// or https://';
    }

    if (f.duration !== null && (!Number.isInteger(f.duration) || f.duration < 1 || f.duration > 1000)) {
      errors.duration = 'Duration must be a whole number of minutes (1–1000).';
    }

    return errors;
  }

  // Message to show under a field: our own check first, then the backend's answer
  fieldError(field: keyof MovieFormData): string {
    const own = this.submitted ? this.errors[field] : undefined;
    return own ?? this.serverErrors()[field]?.[0] ?? '';
  }

  isValidUrl(value: string): boolean {
    try {
      const url = new URL(value.trim());
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  get showPosterPreview(): boolean {
    return this.isValidUrl(this.form.poster_url) && !this.posterBroken;
  }

  onPosterUrlChange() {
    // A new link may work even if the old one was broken
    this.posterBroken = false;
  }

  isGenreSelected(id: number): boolean {
    return this.selectedGenreIds.includes(id);
  }

  toggleGenre(id: number) {
    this.selectedGenreIds = this.isGenreSelected(id)
      ? this.selectedGenreIds.filter(g => g !== id)
      : [...this.selectedGenreIds, id];
  }

  save() {
    this.submitted = true;
    this.saveError.set('');
    this.serverErrors.set({});

    if (Object.keys(this.errors).length > 0) {
      this.saveError.set('Please fix the errors above.');
      return;
    }

    const f = this.form;
    const payload: MoviePayload = {
      title: f.title.trim(),
      description: f.description.trim(),
      year: f.year!,
      base_rating: f.base_rating ?? 0,
      poster_url: f.poster_url.trim() || null,
      backdrop_url: f.backdrop_url.trim() || null,
      trailer_url: f.trailer_url.trim() || null,
      content_type: f.content_type,
      director: f.director.trim(),
      actors: f.actors.trim(),
      country: f.country.trim(),
      duration: f.duration,
      genre_ids: this.selectedGenreIds
    };

    const request = this.isEdit
      ? this.movieService.updateMovie(this.movieId!, payload)
      : this.movieService.createMovie(payload);

    this.saving.set(true);

    request.subscribe({
      next: (movie) => {
        this.saving.set(false);
        this.router.navigate(['/movies', movie.id]);
      },
      error: (err) => {
        this.saving.set(false);
        if (err.status === 400 && err.error) {
          this.serverErrors.set(err.error);
          this.saveError.set('The server rejected some fields. Please check them.');
        } else if (err.status === 403) {
          this.saveError.set('Only admins can save movies.');
        } else {
          this.saveError.set('Failed to save the movie. Please try again.');
        }
      }
    });
  }
}

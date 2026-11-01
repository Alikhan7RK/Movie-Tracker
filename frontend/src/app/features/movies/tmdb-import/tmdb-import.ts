import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Navbar } from '../../../shared/navbar/navbar';
import { TmdbService } from '../../../services/tmdb.service';
import { TmdbSearchResult } from '../../../models/tmdb.model';

// The backend sends {"error": "..."}; show that, or a general message
function errorMessage(err: any, fallback: string): string {
  if (err.status === 0) {
    return 'Cannot connect to server. Make sure the backend is running on port 8000.';
  }
  return err.error?.error || fallback;
}

@Component({
  selector: 'app-tmdb-import',
  standalone: true,
  imports: [FormsModule, RouterLink, Navbar],
  templateUrl: './tmdb-import.html',
  styleUrl: './tmdb-import.css'
})
export class TmdbImport {
  query = '';

  // Signals, so the page updates when the HTTP response arrives (zoneless app)
  results = signal<TmdbSearchResult[]>([]);
  searching = signal(false);
  searched = signal(false); // true after the first search, to show "No movies found"
  error = signal('');
  importingId = signal<number | null>(null);

  constructor(private tmdbService: TmdbService, private router: Router) {}

  search(): void {
    const query = this.query.trim();
    if (!query) {
      this.error.set('Enter a movie title.');
      return;
    }

    this.searching.set(true);
    this.error.set('');
    this.tmdbService.search(query).subscribe({
      next: (results) => {
        this.results.set(results);
        this.searched.set(true);
        this.searching.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err, 'Search failed. Try again.'));
        this.searching.set(false);
      }
    });
  }

  importMovie(result: TmdbSearchResult): void {
    this.importingId.set(result.tmdb_id);
    this.error.set('');
    this.tmdbService.importMovie(result.tmdb_id).subscribe({
      // Show the imported movie right away
      next: (movie) => this.router.navigate(['/movies', movie.id]),
      error: (err) => {
        this.error.set(errorMessage(err, `Could not import "${result.title}".`));
        this.importingId.set(null);
      }
    });
  }
}

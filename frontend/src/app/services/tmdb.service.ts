import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { Movie } from '../models/movie.model';
import { TmdbSearchResult } from '../models/tmdb.model';

// Admin only: search The Movie Database and import movies from it (the backend talks to TMDB)
@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private apiUrl = `${API_URL}/tmdb`;

  constructor(private http: HttpClient) {}

  search(query: string): Observable<TmdbSearchResult[]> {
    return this.http.get<TmdbSearchResult[]>(`${this.apiUrl}/search/`, { params: { q: query } });
  }

  // Creates the movie, or updates it if it was imported before
  importMovie(tmdbId: number): Observable<Movie> {
    return this.http.post<Movie>(`${this.apiUrl}/import/`, { tmdb_id: tmdbId });
  }
}

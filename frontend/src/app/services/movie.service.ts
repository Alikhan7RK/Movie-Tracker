import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { Genre, Movie, MoviePage, MoviePayload, MovieQuery } from '../models/movie.model';

@Injectable({
  providedIn: 'root'
})
export class MovieService {
  private apiUrl = `${API_URL}/movies/`;

  constructor(private http: HttpClient) {}

  // Search, filters, sorting and pagination are done by the backend, e.g. /api/movies/?search=nolan&page=2
  getMovies(query: MovieQuery = {}): Observable<MoviePage> {
    let params = new HttpParams();
    for (const [name, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(name, String(value));
      }
    }
    return this.http.get<MoviePage>(this.apiUrl, { params });
  }

  getMovie(id: number): Observable<Movie> {
    return this.http.get<Movie>(`${this.apiUrl}${id}/`);
  }

  getGenres(): Observable<Genre[]> {
    return this.http.get<Genre[]>(`${API_URL}/genres/`);
  }

  // Create / update / delete need an admin account (checked by the backend)
  createMovie(movie: MoviePayload): Observable<Movie> {
    return this.http.post<Movie>(this.apiUrl, movie);
  }

  updateMovie(id: number, movie: MoviePayload): Observable<Movie> {
    return this.http.put<Movie>(`${this.apiUrl}${id}/`, movie);
  }

  deleteMovie(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { WatchlistItem } from '../models/watchlist.model';

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private apiUrl = 'http://127.0.0.1:8000/api/watchlist/';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`
    });
  }

  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(this.apiUrl, {
      headers: this.getAuthHeaders()
    });
  }

  addToWatchlist(movieId: number, status: 'planned' | 'watching' | 'completed' = 'planned'): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(
      this.apiUrl,
      {
        movie: movieId,
        status: status
      },
      {
        headers: this.getAuthHeaders()
      }
    );
  }
}
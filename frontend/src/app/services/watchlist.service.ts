import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { WatchlistItem } from '../models/watchlist.model';

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private apiUrl = `${API_URL}/watchlist/`;

  constructor(private http: HttpClient) {}

  getWatchlist(): Observable<WatchlistItem[]> {
    return this.http.get<WatchlistItem[]>(this.apiUrl);
  }

  addToWatchlist(
    movieId: number,
    status: 'planned' | 'watching' | 'completed' = 'planned'
  ): Observable<WatchlistItem> {
    return this.http.post<WatchlistItem>(this.apiUrl, {
      movie: movieId,
      status: status
    });
  }
}
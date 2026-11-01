import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api.config';
import { Review } from '../models/review.model';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${API_URL}/reviews/`;

  constructor(private http: HttpClient) {}

  // Reviews of one movie (public, no login needed)
  getReviews(movieId: number): Observable<Review[]> {
    return this.http.get<Review[]>(this.apiUrl, { params: { movie: movieId } });
  }

  // Creates a review, or updates it if this user already reviewed the movie
  addReview(movieId: number, text: string, stars: number): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, {
      movie: movieId,
      text,
      stars
    });
  }

  deleteReview(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}${id}/`);
  }
}

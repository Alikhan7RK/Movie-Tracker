import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Review {
  id: number;
  user: string;
  movie: number;
  movie_title: string;
  text: string;
  stars: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = 'http://127.0.0.1:8000/api/reviews/';

  constructor(private http: HttpClient) {}

  getReviews(): Observable<Review[]> {
    return this.http.get<Review[]>(this.apiUrl);
  }

  addReview(movieId: number, text: string, stars: number): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, {
      movie: movieId,
      text,
      stars
    });
  }
}
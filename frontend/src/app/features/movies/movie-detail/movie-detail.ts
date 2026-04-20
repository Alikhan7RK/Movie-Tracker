import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieService } from '../../../services/movie.service';
import { WatchlistService } from '../../../services/watchlist.service';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetail {
  movie: any;
  rating = 0;
  comment = '';
  comments: any[] = [];

  constructor(
    private route: ActivatedRoute,
    private movieService: MovieService,
    private watchlistService: WatchlistService
  ) {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.movie = this.movieService.getMovieById(id);
  }

  setRating(value: number) {
    this.rating = value;
  }

  addComment() {
    if (!this.comment || !this.rating) return;

    this.comments.push({
      text: this.comment,
      rating: this.rating
    });

    this.comment = '';
    this.rating = 0;
  }
  addToWatchlist() {
    if (!this.movie) return;

    this.watchlistService.addToWatchlist(this.movie.id).subscribe({
      next: () => {
        alert('Movie added to watchlist!');
      },
      error: () => {
        alert('Failed to add movie to watchlist. Make sure you are logged in.');
      }
    });
  }
}

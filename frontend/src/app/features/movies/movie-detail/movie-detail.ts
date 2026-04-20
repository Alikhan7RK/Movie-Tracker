import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieService } from '../../../service/movie.service';

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
    private movieService: MovieService
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
}

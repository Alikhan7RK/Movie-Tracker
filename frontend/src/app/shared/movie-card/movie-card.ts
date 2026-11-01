import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';
import { Movie } from '../../models/movie.model';
import { RatingPipe } from '../rating.pipe';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RatingPipe],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  @Input({ required: true }) movie!: Movie;

  constructor(private router: Router) {}

  openMovie() {
    this.router.navigate(['/movies', this.movie.id]);
  }
}

import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CONTENT_TYPES, Movie } from '../../models/movie.model';
import { RatingPipe } from '../rating.pipe';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink, RatingPipe],
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  @Input({ required: true }) movie!: Movie;

  // "anime" -> "Anime"
  get typeLabel(): string {
    return CONTENT_TYPES.find(t => t.value === this.movie.content_type)?.label ?? '';
  }
}

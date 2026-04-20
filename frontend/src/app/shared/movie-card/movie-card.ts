import { Component, Input } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  templateUrl: './movie-card.html',
  styleUrl: './movie-card.css'
})
export class MovieCard {
  @Input() movie: any;

  constructor(private router: Router) {}

  openMovie() {
    console.log(this.movie.id);
    this.router.navigate(['/movies', this.movie.id]);
  }
}

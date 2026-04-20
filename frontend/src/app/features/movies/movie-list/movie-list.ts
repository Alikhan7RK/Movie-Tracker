import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Navbar } from '../../../shared/navbar/navbar';
import { MovieCard } from '../../../shared/movie-card/movie-card';
import { MovieService } from '../../../services/movie.service';

@Component({
  selector: 'app-movie-list',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar, MovieCard],
  templateUrl: './movie-list.html',
  styleUrl: './movie-list.css'
})
export class MovieList {
  search = '';
  selectedGenre = '';

  genres = ['Action', 'Drama', 'Sci-Fi', 'Crime'];

  movies: any[] = [];

  constructor(private movieService: MovieService) {}

  ngOnInit() {
    this.movies = this.movieService.getMovies();
  }

  get filteredMovies() {
    return this.movies.filter(m =>
      m.title.toLowerCase().includes(this.search.toLowerCase()) &&
      (this.selectedGenre ? m.genre === this.selectedGenre : true)
    );
  }
}

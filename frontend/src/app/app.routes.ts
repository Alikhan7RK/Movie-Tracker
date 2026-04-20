import { Routes } from '@angular/router';
import { MovieList } from './features/movies/movie-list/movie-list';
import { MovieDetail } from './features/movies/movie-detail/movie-detail';

export const routes: Routes = [
  { path: '', redirectTo: 'movies', pathMatch: 'full' },
  { path: 'movies', component: MovieList },
  { path: 'movies/:id', component: MovieDetail }
];

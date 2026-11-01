import { Routes } from '@angular/router';
import { MovieList } from './features/movies/movie-list/movie-list';
import { MovieDetail } from './features/movies/movie-detail/movie-detail';
import { MovieForm } from './features/movies/movie-form/movie-form';
import { TmdbImport } from './features/movies/tmdb-import/tmdb-import';
import { Watchlist } from './features/watchlist/watchlist';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { Profile } from './features/profile/profile';
import { authGuard } from './core/interceptors/guards/auth.guard';
import { adminGuard } from './core/interceptors/guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'movies', pathMatch: 'full' },
  { path: 'movies', component: MovieList },
  // 'movies/new' and 'movies/import' must come before 'movies/:id', otherwise they would be read as a movie id
  { path: 'movies/new', component: MovieForm, canActivate: [adminGuard] },
  { path: 'movies/import', component: TmdbImport, canActivate: [adminGuard] },
  { path: 'movies/:id/edit', component: MovieForm, canActivate: [adminGuard] },
  { path: 'movies/:id', component: MovieDetail },
  { path: 'watchlist', component: Watchlist, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'profile', component: Profile, canActivate: [authGuard] },
];
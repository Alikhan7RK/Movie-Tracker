import { Movie } from '../models/movie.model';

// Wide background image for the movie list banner and the movie page:
// the backdrop if the movie has one, otherwise the poster, otherwise nothing.
export function backdropImage(movie: Pick<Movie, 'backdrop_url' | 'poster_url'>): string | null {
  return movie.backdrop_url || movie.poster_url || null;
}

// True when only the (tall) poster is available, so the page can crop it differently
export function usesPosterAsBackdrop(movie: Pick<Movie, 'backdrop_url' | 'poster_url'>): boolean {
  return !movie.backdrop_url && !!movie.poster_url;
}

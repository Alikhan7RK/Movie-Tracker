export interface WatchlistItem {
  id: number;
  user: string;
  movie: number;
  movie_title: string;
  movie_poster: string | null;
  movie_year: number;
  movie_rating: string;
  status: 'planned' | 'watching' | 'completed';
  added_at: string;
}
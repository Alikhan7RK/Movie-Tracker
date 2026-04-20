export interface WatchlistItem {
  id: number;
  user: string;
  movie: number;
  movie_title: string;
  status: 'planned' | 'watching' | 'completed';
  added_at: string;
}
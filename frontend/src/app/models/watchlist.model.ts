export type WatchlistStatus = 'planned' | 'watching' | 'completed';

// Used for the status dropdown, the filter tabs and labels
export const WATCHLIST_STATUSES: { value: WatchlistStatus; label: string }[] = [
  { value: 'planned', label: 'Planned' },
  { value: 'watching', label: 'Watching' },
  { value: 'completed', label: 'Completed' }
];

export interface WatchlistItem {
  id: number;
  user: string;
  movie: number;
  movie_title: string;
  movie_poster: string | null;
  movie_year: number;
  movie_rating: string;
  status: WatchlistStatus;
  added_at: string;
}

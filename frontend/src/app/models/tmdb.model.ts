// One result of GET /api/tmdb/search/ (see TmdbSearchView in backend/movies/views.py)
export interface TmdbSearchResult {
  tmdb_id: number;
  title: string;
  year: number | null;
  overview: string;
  poster_url: string | null;
  rating: number; // TMDB average vote, out of 10
  imported_movie_id: number | null; // our movie id if it was already imported
}

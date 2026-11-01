export interface Genre {
  id: number;
  name: string;
}

export type ContentType = 'movie' | 'series' | 'cartoon' | 'anime';

// Used for dropdowns and labels (same choices as Movie.CONTENT_TYPES in the backend)
export const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: 'movie', label: 'Movie' },
  { value: 'series', label: 'Series' },
  { value: 'cartoon', label: 'Cartoon' },
  { value: 'anime', label: 'Anime' }
];

// Same fields as MovieSerializer in backend/movies/serializers.py
export interface Movie {
  id: number;
  title: string;
  description: string;
  year: number;
  rating: string; // DRF sends DecimalField as a string, e.g. "8.8" (out of 10). Average of reviews, or base_rating
  base_rating: string; // original rating, used when the movie has no reviews
  trailer_url: string | null;
  poster_url: string | null;
  content_type: ContentType;
  director: string;
  actors: string;
  country: string;
  duration: number | null; // minutes
  genres: Genre[];
  created_at: string;
}

// What we send to POST/PUT /api/movies/: genres are sent as a list of ids
export interface MoviePayload {
  title: string;
  description: string;
  year: number;
  base_rating?: number;
  trailer_url?: string | null;
  poster_url?: string | null;
  content_type?: ContentType;
  director?: string;
  actors?: string;
  country?: string;
  duration?: number | null;
  genre_ids?: number[];
}

// One page of GET /api/movies/ (see MoviePagination in backend/movies/pagination.py)
export interface MoviePage {
  count: number; // movies matching the filters, on all pages
  total_pages: number;
  next: string | null;
  previous: string | null;
  results: Movie[];
}

// Query parameters for GET /api/movies/; empty values are not sent
export interface MovieQuery {
  page?: number;
  search?: string;
  genre?: number | '';
  content_type?: ContentType | '';
  ordering?: string;
}

// Same values as MOVIE_ORDERING_FIELDS in backend/movies/views.py ('' = backend default, newest added first)
export const MOVIE_ORDERINGS: { value: string; label: string }[] = [
  { value: '', label: 'Newest added' },
  { value: '-rating', label: 'Rating: high to low' },
  { value: 'rating', label: 'Rating: low to high' },
  { value: '-year', label: 'Year: newest' },
  { value: 'year', label: 'Year: oldest' },
  { value: 'title', label: 'Title: A-Z' },
  { value: '-title', label: 'Title: Z-A' }
];

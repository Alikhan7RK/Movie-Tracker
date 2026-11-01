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

export interface Genre {
  id: number;
  name: string;
}

export type ContentType = 'movie' | 'series' | 'cartoon' | 'anime';

// Same fields as MovieSerializer in backend/movies/serializers.py
export interface Movie {
  id: number;
  title: string;
  description: string;
  year: number;
  rating: string; // DRF sends DecimalField as a string, e.g. "8.8" (out of 10)
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
  rating?: number;
  trailer_url?: string | null;
  poster_url?: string | null;
  content_type?: ContentType;
  director?: string;
  actors?: string;
  country?: string;
  duration?: number | null;
  genre_ids?: number[];
}

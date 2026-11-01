// Same fields as ReviewSerializer in backend/movies/serializers.py
export interface Review {
  id: number;
  user: string; // username
  movie: number;
  movie_title: string;
  text: string;
  stars: number; // 1-5
  created_at: string;
}

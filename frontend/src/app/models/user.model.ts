export interface UserReview {
  id: number;
  movie: number;
  movie_title: string;
  text: string;
  stars: number;
  created_at: string;
}

export interface UserProfile {
  id: number;
  username: string;
  email: string;
  reviews: UserReview[];
}

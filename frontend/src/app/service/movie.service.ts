import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MovieService {

  movies = [
    {
      id: 1,
      title: 'Inception',
      genre: 'Sci-Fi',
      rating: 8.8,
      image: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
      description: 'Dream inside a dream'
    },
    {
      id: 2,
      title: 'The Dark Knight',
      genre: 'Action',
      rating: 9.0,
      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      description: 'Batman vs Joker'
    },
    {
      id: 3,
      title: 'Interstellar',
      genre: 'Sci-Fi',
      rating: 8.6,
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      description: 'Space travel'
    },
    {
      id: 4,
      title: 'Shawshank Redemption',
      genre: 'Drama',
      rating: 9.3,
      image: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
      description: 'Prison story'
    },
    {
      id: 5,
      title: 'Pulp Fiction',
      genre: 'Crime',
      rating: 8.9,
      image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      description: 'Gangster story'
    },
    {
      id: 6,
      title: 'The Godfather',
      genre: 'Crime',
      rating: 9.2,
      image: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      description: 'Mafia family'
    },
    {
      id: 7,
      title: 'Fight Club',
      genre: 'Drama',
      rating: 8.8,
      image: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      description: 'Underground club'
    },
    {
      id: 8,
      title: 'Gladiator',
      genre: 'Action',
      rating: 8.5,
      image: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
      description: 'Roman empire'
    }
  ];

  getMovies() {
    return this.movies;
  }

  getMovieById(id: number) {
    return this.movies.find(m => m.id === id);
  }
}

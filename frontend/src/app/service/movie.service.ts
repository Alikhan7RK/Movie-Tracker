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
      description: 'A thief who steals corporate secrets through dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO.',
      releaseDate: '2010',
      country: 'USA',
      director: 'Christopher Nolan',
      actors: 'Leonardo DiCaprio, Joseph Gordon-Levitt, Elliot Page, Tom Hardy',
      duration: '148 min'
    },
    {
      id: 2,
      title: 'The Dark Knight',
      genre: 'Action',
      rating: 9.0,
      image: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
      description: 'Batman faces the Joker, a criminal mastermind who plunges Gotham into chaos.',
      releaseDate: '2008',
      country: 'USA',
      director: 'Christopher Nolan',
      actors: 'Christian Bale, Heath Ledger, Aaron Eckhart, Gary Oldman',
      duration: '152 min'
    },
    {
      id: 3,
      title: 'Interstellar',
      genre: 'Sci-Fi',
      rating: 8.6,
      image: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity’s survival.',
      releaseDate: '2014',
      country: 'USA',
      director: 'Christopher Nolan',
      actors: 'Matthew McConaughey, Anne Hathaway, Jessica Chastain, Michael Caine',
      duration: '169 min'
    },
    {
      id: 4,
      title: 'The Shawshank Redemption',
      genre: 'Drama',
      rating: 9.3,
      image: 'https://image.tmdb.org/t/p/w500/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg',
      description: 'Two imprisoned men bond over a number of years, finding solace and redemption through acts of common decency.',
      releaseDate: '1994',
      country: 'USA',
      director: 'Frank Darabont',
      actors: 'Tim Robbins, Morgan Freeman, Bob Gunton',
      duration: '142 min'
    },
    {
      id: 5,
      title: 'Pulp Fiction',
      genre: 'Crime',
      rating: 8.9,
      image: 'https://image.tmdb.org/t/p/w500/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
      description: 'The lives of two mob hitmen, a boxer, and others intertwine in tales of violence and redemption.',
      releaseDate: '1994',
      country: 'USA',
      director: 'Quentin Tarantino',
      actors: 'John Travolta, Uma Thurman, Samuel L. Jackson, Bruce Willis',
      duration: '154 min'
    },
    {
      id: 6,
      title: 'The Godfather',
      genre: 'Crime',
      rating: 9.2,
      image: 'https://image.tmdb.org/t/p/w500/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
      description: 'The aging patriarch of an organized crime dynasty transfers control of his empire to his reluctant son.',
      releaseDate: '1972',
      country: 'USA',
      director: 'Francis Ford Coppola',
      actors: 'Marlon Brando, Al Pacino, James Caan, Robert Duvall',
      duration: '175 min'
    },
    {
      id: 7,
      title: 'Fight Club',
      genre: 'Drama',
      rating: 8.8,
      image: 'https://image.tmdb.org/t/p/w500/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
      description: 'An insomniac office worker and a soap maker form an underground fight club.',
      releaseDate: '1999',
      country: 'USA',
      director: 'David Fincher',
      actors: 'Brad Pitt, Edward Norton, Helena Bonham Carter',
      duration: '139 min'
    },
    {
      id: 8,
      title: 'Gladiator',
      genre: 'Action',
      rating: 8.5,
      image: 'https://image.tmdb.org/t/p/w500/ty8TGRuvJLPUmAR1H1nRIsgwvim.jpg',
      description: 'A former Roman general sets out to exact vengeance against the corrupt emperor.',
      releaseDate: '2000',
      country: 'USA',
      director: 'Ridley Scott',
      actors: 'Russell Crowe, Joaquin Phoenix, Connie Nielsen',
      duration: '155 min'
    }
  ];

  getMovies() {
    return this.movies;
  }

  getMovieById(id: number) {
    return this.movies.find(movie => movie.id === id);
  }
}

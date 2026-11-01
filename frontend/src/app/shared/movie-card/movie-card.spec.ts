import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Movie } from '../../models/movie.model';

import { MovieCard } from './movie-card';

describe('MovieCard', () => {
  let component: MovieCard;
  let fixture: ComponentFixture<MovieCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieCard],
      providers: [provideRouter([])]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MovieCard);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('movie', {
      id: 1, title: 'Test', description: '', year: 2000, rating: '8.0',
      trailer_url: null, poster_url: null, content_type: 'movie',
      director: '', actors: '', country: '', duration: null, genres: [], created_at: ''
    } satisfies Movie);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

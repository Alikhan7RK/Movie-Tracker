import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { TmdbImport } from './tmdb-import';
import { API_URL } from '../../../core/api.config';
import { TmdbSearchResult } from '../../../models/tmdb.model';

describe('TmdbImport', () => {
  let component: TmdbImport;
  let fixture: ComponentFixture<TmdbImport>;
  let httpMock: HttpTestingController;
  let router: Router;

  const dune: TmdbSearchResult = {
    tmdb_id: 438631, title: 'Dune', year: 2021, overview: 'Spice.', poster_url: null, rating: 7.8, imported_movie_id: null
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TmdbImport],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(TmdbImport);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => httpMock.verify());

  it('asks for a title before searching', () => {
    component.query = '  ';
    component.search();

    expect(component.error()).toBe('Enter a movie title.');
  });

  it('searches TMDB through the backend and shows the results', () => {
    component.query = ' dune ';
    component.search();
    expect(component.searching()).toBe(true);

    const req = httpMock.expectOne((r) => r.url === `${API_URL}/tmdb/search/`);
    expect(req.request.params.get('q')).toBe('dune');
    req.flush([dune]);

    expect(component.results()).toEqual([dune]);
    expect(component.searching()).toBe(false);
    expect(component.searched()).toBe(true);
  });

  it('imports a movie and opens it', () => {
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.importMovie(dune);
    expect(component.importingId()).toBe(438631);

    const req = httpMock.expectOne(`${API_URL}/tmdb/import/`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ tmdb_id: 438631 });
    req.flush({ id: 42 });

    expect(navigate).toHaveBeenCalledWith(['/movies', 42]);
  });

  it('shows the server message when TMDB is not configured', () => {
    component.query = 'dune';
    component.search();

    httpMock
      .expectOne((r) => r.url === `${API_URL}/tmdb/search/`)
      .flush({ error: 'TMDB_API_KEY is not set on the server.' }, { status: 503, statusText: 'Service Unavailable' });

    expect(component.error()).toBe('TMDB_API_KEY is not set on the server.');
  });

  it('lets the admin try again after a failed import', () => {
    component.importMovie(dune);

    httpMock.expectOne(`${API_URL}/tmdb/import/`).flush({ error: 'Movie not found on TMDB.' }, { status: 404, statusText: 'Not Found' });

    expect(component.error()).toBe('Movie not found on TMDB.');
    expect(component.importingId()).toBeNull();
  });
});

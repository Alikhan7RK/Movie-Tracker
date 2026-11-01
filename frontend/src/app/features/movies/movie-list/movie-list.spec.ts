import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

import { MovieList } from './movie-list';
import { API_URL } from '../../../core/api.config';

describe('MovieList', () => {
  let component: MovieList;
  let fixture: ComponentFixture<MovieList>;
  let httpMock: HttpTestingController;

  const moviesUrl = `${API_URL}/movies/`;
  const page = (count: number, totalPages: number) => ({ count, total_pages: totalPages, next: null, previous: null, results: [] });

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MovieList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    })
    .compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MovieList);
    component = fixture.componentInstance;
    fixture.detectChanges();
    httpMock.expectOne(`${API_URL}/genres/`).flush([]);
  });

  afterEach(() => httpMock.verify());

  it('loads the first page', () => {
    const req = httpMock.expectOne((r) => r.url === moviesUrl);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.has('search')).toBe(false);
    req.flush(page(30, 3));

    expect(component.totalPages()).toBe(3);
    expect(component.pageNumbers()).toEqual([1, 2, 3]);
  });

  it('sends filters and sorting to the backend and goes back to page 1', () => {
    httpMock.expectOne((r) => r.url === moviesUrl).flush(page(30, 3));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => {}); // the test browser (jsdom) has no scrolling
    component.goToPage(2);
    httpMock.expectOne((r) => r.params.get('page') === '2').flush(page(30, 3));

    component.selectedGenre = 3;
    component.selectedType = 'anime';
    component.ordering = '-rating';
    component.onFiltersChange();

    const req = httpMock.expectOne((r) => r.url === moviesUrl);
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('genre')).toBe('3');
    expect(req.request.params.get('content_type')).toBe('anime');
    expect(req.request.params.get('ordering')).toBe('-rating');
    req.flush(page(1, 1));
  });

  it('waits for the user to stop typing before searching', () => {
    vi.useFakeTimers();
    httpMock.expectOne((r) => r.url === moviesUrl).flush(page(0, 1));

    component.search = 'nol';
    component.onSearchChange('nol');
    component.search = 'nolan';
    component.onSearchChange('nolan');
    httpMock.expectNone((r) => r.url === moviesUrl);

    vi.advanceTimersByTime(400);
    const req = httpMock.expectOne((r) => r.url === moviesUrl);
    expect(req.request.params.get('search')).toBe('nolan');
    req.flush(page(1, 1));
    vi.useRealTimers();
  });
});

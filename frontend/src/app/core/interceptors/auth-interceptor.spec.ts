import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';

import { authInterceptor } from './auth-interceptor';
import { API_URL } from '../api.config';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        provideRouter([])
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds the access token to requests', () => {
    localStorage.setItem('access_token', 'access-1');

    http.get(`${API_URL}/profile/`).subscribe();

    const req = httpMock.expectOne(`${API_URL}/profile/`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-1');
    req.flush({});
  });

  it('on 401 refreshes the token and retries the request', () => {
    localStorage.setItem('access_token', 'old-access');
    localStorage.setItem('refresh_token', 'refresh-1');
    let result: unknown;

    http.get(`${API_URL}/profile/`).subscribe((data) => (result = data));

    httpMock.expectOne(`${API_URL}/profile/`).flush({}, { status: 401, statusText: 'Unauthorized' });

    const refresh = httpMock.expectOne(`${API_URL}/token/refresh/`);
    expect(refresh.request.body).toEqual({ refresh: 'refresh-1' });
    expect(refresh.request.headers.has('Authorization')).toBe(false);
    refresh.flush({ access: 'new-access' });

    const retry = httpMock.expectOne(`${API_URL}/profile/`);
    expect(retry.request.headers.get('Authorization')).toBe('Bearer new-access');
    retry.flush({ username: 'alice' });

    expect(result).toEqual({ username: 'alice' });
    expect(localStorage.getItem('access_token')).toBe('new-access');
  });

  it('logs out and goes to /login when the refresh fails', () => {
    localStorage.setItem('access_token', 'old-access');
    localStorage.setItem('refresh_token', 'expired-refresh');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    let status = 0;

    http.get(`${API_URL}/profile/`).subscribe({ error: (err) => (status = err.status) });

    httpMock.expectOne(`${API_URL}/profile/`).flush({}, { status: 401, statusText: 'Unauthorized' });
    httpMock.expectOne(`${API_URL}/token/refresh/`).flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not refresh on other errors', () => {
    localStorage.setItem('access_token', 'access-1');
    localStorage.setItem('refresh_token', 'refresh-1');

    http.get(`${API_URL}/movies/`).subscribe({ error: () => {} });

    httpMock.expectOne(`${API_URL}/movies/`).flush({}, { status: 500, statusText: 'Server Error' });
    httpMock.expectNone(`${API_URL}/token/refresh/`);
    expect(localStorage.getItem('access_token')).toBe('access-1');
  });
});

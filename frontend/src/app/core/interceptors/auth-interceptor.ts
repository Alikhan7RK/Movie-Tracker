import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, shareReplay, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';

// These requests never get a token and never trigger a token refresh
const PUBLIC_URLS = ['/api/login/', '/api/register/', '/api/token/refresh/'];

// If several requests get a 401 at the same time, they all wait for this one refresh request
let refreshInProgress: Observable<string> | null = null;

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isPublicRequest = PUBLIC_URLS.some((url) => req.url.includes(url));

  if (isPublicRequest) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  const authService = inject(AuthService);

  return next(withToken(req, token)).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // 401 while we sent a token = the access token expired (or is invalid).
      // Get a new one with the refresh token and send the original request once more.
      if (!refreshInProgress) {
        refreshInProgress = authService.refreshAccessToken().pipe(
          finalize(() => (refreshInProgress = null)),
          shareReplay(1)
        );
      }

      return refreshInProgress.pipe(
        // The refresh token is also expired or was blacklisted by logout: now really log out
        catchError(() => {
          authService.clearSession('/login');
          return throwError(() => error);
        }),
        // The retry goes straight to the next handler, so a second 401 cannot start another refresh
        switchMap((newToken) => next(withToken(req, newToken)))
      );
    })
  );
};

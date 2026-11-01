import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const publicUrls = ['/api/login/', '/api/register/'];

  const isPublicRequest = publicUrls.some((url) => req.url.includes(url));

  if (isPublicRequest) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');

  if (!token) {
    return next(req);
  }

  const router = inject(Router);

  const cloned = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // 401 while we sent a token = token expired or invalid:
      // log the user out locally and send them to the login page
      if (error.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('username');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};

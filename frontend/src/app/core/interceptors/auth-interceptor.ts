import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const publicUrls = ['/api/login/', '/api/register/'];

  const isPublicRequest = publicUrls.some((url) => req.url.includes(url));

  if (isPublicRequest) {
    return next(req);
  }

  const token = localStorage.getItem('access_token');

  if (token) {
    const cloned = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(cloned);
  }

  return next(req);
};
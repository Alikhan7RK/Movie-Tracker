import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../../services/auth.service';

// Lets only admins (is_staff) open a page. The backend checks this again for every write request.
export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAdmin()) {
    return true;
  }

  // Not logged in -> login page, logged in but not admin -> movie list
  router.navigate([authService.isLoggedIn() ? '/movies' : '/login']);
  return false;
};

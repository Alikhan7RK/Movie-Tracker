import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, switchMap, tap } from 'rxjs';
import { Router } from '@angular/router';
import { API_URL } from '../core/api.config';
import { UserProfile } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = API_URL;

  constructor(private http: HttpClient, private router: Router) {}

  register(username: string, email: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, { username, email, password });
  }

  login(username: string, password: string): Observable<any> {
    return this.http
      .post<{ access: string; refresh: string }>(`${this.apiUrl}/login/`, { username, password })
      .pipe(
        tap((res) => {
          localStorage.setItem('access_token', res.access);
          localStorage.setItem('refresh_token', res.refresh);
          localStorage.setItem('username', username);
        }),
        // After login, ask the profile endpoint whether this user is an admin.
        // If that request fails, login still succeeds and the user is simply not treated as admin.
        switchMap(() =>
          this.http.get<UserProfile>(`${this.apiUrl}/profile/`).pipe(catchError(() => of(null)))
        ),
        tap((profile) => {
          localStorage.setItem('is_staff', String(profile?.is_staff ?? false));
        })
      );
  }

  logout(): void {
    const refresh = localStorage.getItem('refresh_token');

    if (refresh) {
      this.http.post(`${this.apiUrl}/logout/`, { refresh }).subscribe({
        next: () => this.clearSession(),
        error: () => this.clearSession()
      });
    } else {
      this.clearSession();
    }
  }

  private clearSession(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('username');
    localStorage.removeItem('is_staff');
    this.router.navigate(['/movies']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  isAdmin(): boolean {
    return this.isLoggedIn() && localStorage.getItem('is_staff') === 'true';
  }

  getUsername(): string {
    return localStorage.getItem('username') || '';
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

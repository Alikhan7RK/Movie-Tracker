import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://127.0.0.1:8000/api';

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
    this.router.navigate(['/movies']);
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getUsername(): string {
    return localStorage.getItem('username') || '';
  }

  getToken(): string | null {
    return localStorage.getItem('access_token');
  }
}
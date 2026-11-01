import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { UserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { API_URL } from '../../core/api.config';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  // Signals, so the page updates when the HTTP response arrives (zoneless app)
  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  error = signal('');

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadProfile();
  }

  loadProfile(): void {
    this.http.get<UserProfile>(`${API_URL}/profile/`).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Profile load error:', err);

        if (err.status === 0) {
          this.error.set('Cannot connect to server. Make sure the backend is running on port 8000.');
        } else if (err.status === 401) {
          this.error.set('Session expired. Please login again.');
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.error.set(`Error ${err.status}: Failed to load profile.`);
        }

        this.loading.set(false);
      }
    });
  }

  getStars(count: number): string[] {
    return Array(count).fill('★');
  }

  getEmptyStars(count: number): string[] {
    return Array(5 - count).fill('★');
  }
}
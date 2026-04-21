import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { UserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  profile: UserProfile | null = null;
  loading = true;
  error = '';

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
    this.http.get<UserProfile>('http://127.0.0.1:8000/api/profile/').subscribe({
      next: (data) => {
        this.profile = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Profile load error:', err);

        if (err.status === 0) {
          this.error = 'Cannot connect to server. Make sure the backend is running on port 8000.';
        } else if (err.status === 401) {
          this.error = 'Session expired. Please login again.';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        } else {
          this.error = `Error ${err.status}: Failed to load profile.`;
        }

        this.loading = false;
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
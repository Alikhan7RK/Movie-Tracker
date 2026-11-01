import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Navbar } from '../../shared/navbar/navbar';
import { UserProfile } from '../../models/user.model';
import { AuthService } from '../../services/auth.service';
import { API_URL } from '../../core/api.config';

// Same rule as the backend (RegisterSerializer / ChangePasswordSerializer)
const MIN_PASSWORD_LENGTH = 4;

// DRF sends errors like {"username": ["A user with that username already exists."]} -> show the first message
function firstErrorMessage(err: any, fallback: string): string {
  if (err.status === 0) {
    return 'Cannot connect to server. Make sure the backend is running on port 8000.';
  }
  const body = err.error;
  if (body && typeof body === 'object') {
    for (const value of Object.values(body)) {
      const message = Array.isArray(value) ? value[0] : value;
      if (typeof message === 'string') {
        return message;
      }
    }
  }
  return fallback;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './profile.html',
  styleUrl: './profile.css'
})
export class Profile {
  // Signals, so the page updates when the HTTP response arrives (zoneless app)
  profile = signal<UserProfile | null>(null);
  loading = signal(true);
  error = signal('');

  // Edit username / email
  editing = signal(false);
  editUsername = '';
  editEmail = '';
  savingProfile = signal(false);
  profileError = signal('');
  profileMessage = signal('');

  // Change password
  showPasswordForm = signal(false);
  oldPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = signal(false);
  passwordError = signal('');
  passwordMessage = signal('');

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

  startEditing(): void {
    const profile = this.profile();
    if (!profile) {
      return;
    }
    this.editUsername = profile.username;
    this.editEmail = profile.email;
    this.profileError.set('');
    this.profileMessage.set('');
    this.editing.set(true);
  }

  cancelEditing(): void {
    this.editing.set(false);
    this.profileError.set('');
  }

  saveProfile(): void {
    const username = this.editUsername.trim();
    if (!username) {
      this.profileError.set('Username cannot be empty.');
      return;
    }

    this.savingProfile.set(true);
    this.profileError.set('');

    this.authService.updateProfile({ username, email: this.editEmail.trim() }).subscribe({
      next: (data) => {
        this.profile.set(data);
        this.editing.set(false);
        this.savingProfile.set(false);
        this.profileMessage.set('Profile updated.');
      },
      error: (err) => {
        this.profileError.set(firstErrorMessage(err, 'Failed to update profile.'));
        this.savingProfile.set(false);
      }
    });
  }

  togglePasswordForm(): void {
    this.showPasswordForm.set(!this.showPasswordForm());
    this.oldPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
    this.passwordError.set('');
    this.passwordMessage.set('');
  }

  changePassword(): void {
    if (!this.oldPassword || !this.newPassword) {
      this.passwordError.set('Fill in all password fields.');
      return;
    }
    if (this.newPassword.length < MIN_PASSWORD_LENGTH) {
      this.passwordError.set(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.passwordError.set('New passwords do not match.');
      return;
    }

    this.savingPassword.set(true);
    this.passwordError.set('');

    this.authService.changePassword(this.oldPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.togglePasswordForm();
        this.passwordMessage.set('Password changed.');
      },
      error: (err) => {
        this.passwordError.set(firstErrorMessage(err, 'Failed to change password.'));
        this.savingPassword.set(false);
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

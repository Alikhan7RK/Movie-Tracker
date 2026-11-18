import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  // Signals, so messages set inside subscribe() show up (zoneless app)
  error = signal('');
  loading = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error.set('Please fill in all fields.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.router.navigate(['/movies']);
      },
      error: (err: HttpErrorResponse) => {
        // 429 = the backend login throttle (10 attempts per minute), not a wrong password
        if (err.status === 429) {
          this.error.set('Too many login attempts. Please wait a minute and try again.');
        } else {
          this.error.set('Invalid username or password.');
        }
        this.loading.set(false);
      }
    });
  }
}

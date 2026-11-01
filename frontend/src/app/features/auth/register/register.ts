import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  username = '';
  email = '';
  password = '';
  // Signals, so messages set inside subscribe() show up (zoneless app)
  error = signal('');
  success = signal('');
  loading = signal(false);

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error.set('Username and password are required.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.success.set('');

    this.authService.register(this.username, this.email, this.password).subscribe({
      next: () => {
        this.success.set('Account created! Redirecting to login...');
        setTimeout(() => this.router.navigate(['/login']), 1200);
      },
      error: (err) => {
        const data = err.error;
        if (data?.username) {
          this.error.set(data.username[0]);
        } else {
          this.error.set('Registration failed. Please try again.');
        }
        this.loading.set(false);
      }
    });
  }
}

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div>
        <div class="auth-logo">
          <div class="brand">পরিচয় Porichoy</div>
          <div class="tagline">Identity & Access Management</div>
        </div>

        <div class="form-card">
          <h2 style="margin:0 0 1.25rem;font-size:18px">Create account</h2>

          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          @if (success()) { <div class="alert alert-success">{{ success() }}</div> }

          <form (ngSubmit)="submit()">
            <div class="form-group">
              <label>Display name</label>
              <input type="text" [(ngModel)]="form.displayName" name="displayName" placeholder="Your name" required />
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" [(ngModel)]="form.email" name="email" placeholder="email@example.com" />
            </div>
            <div class="form-group">
              <label>Phone</label>
              <input type="tel" [(ngModel)]="form.phone" name="phone" placeholder="+880..." />
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" [(ngModel)]="form.password" name="password" />
            </div>
            <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
              @if (loading()) { <span class="spinner"></span> } Create account
            </button>
          </form>
        </div>

        <div class="auth-footer">
          Already have an account? <a routerLink="/login">Sign in</a>
        </div>
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private auth = inject(AuthStore);
  private router = inject(Router);

  loading = signal(false);
  error = signal('');
  success = signal('');

  form = { displayName: '', email: '', phone: '', password: '' };

  async submit() {
    this.error.set('');
    this.success.set('');
    if (!this.form.displayName) { this.error.set('Display name is required'); return; }
    if (!this.form.email && !this.form.phone) { this.error.set('Email or phone is required'); return; }

    this.loading.set(true);
    try {
      await this.auth.register({
        displayName: this.form.displayName,
        email: this.form.email || undefined,
        phone: this.form.phone || undefined,
        password: this.form.password || undefined,
      });
      this.success.set('Account created! You can now sign in.');
      setTimeout(() => this.router.navigate(['/login']), 1500);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Registration failed');
    } finally {
      this.loading.set(false);
    }
  }
}

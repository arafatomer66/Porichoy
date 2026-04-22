import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';

@Component({
  selector: 'app-login',
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
          <h2 style="margin:0 0 1.25rem;font-size:18px">Sign in</h2>

          @if (error()) {
            <div class="alert alert-error">{{ error() }}</div>
          }

          <div style="display:flex;gap:.5rem;margin-bottom:1rem">
            <button class="btn btn-secondary btn-sm" [class.btn-primary]="mode()==='password'" (click)="mode.set('password')">Password</button>
            <button class="btn btn-secondary btn-sm" [class.btn-primary]="mode()==='otp'" (click)="mode.set('otp')">OTP</button>
          </div>

          @if (mode() === 'password') {
            <form (ngSubmit)="loginPassword()">
              <div class="form-group">
                <label>Email or phone</label>
                <input type="text" [(ngModel)]="identifier" name="identifier" placeholder="email@example.com" required />
              </div>
              <div class="form-group">
                <label>Password</label>
                <input type="password" [(ngModel)]="password" name="password" required />
              </div>
              <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
                @if (loading()) { <span class="spinner"></span> } Sign in
              </button>
            </form>
          }

          @if (mode() === 'otp') {
            @if (!otpSent()) {
              <form (ngSubmit)="requestOtp()">
                <div class="form-group">
                  <label>Email or phone</label>
                  <input type="text" [(ngModel)]="identifier" name="identifier" placeholder="email@example.com" required />
                </div>
                <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
                  @if (loading()) { <span class="spinner"></span> } Send OTP
                </button>
              </form>
            } @else {
              <form (ngSubmit)="verifyOtp()">
                <div class="alert alert-info">OTP sent{{ devOtp() ? ' (dev: ' + devOtp() + ')' : '' }}</div>
                <div class="form-group">
                  <label>Enter OTP</label>
                  <input type="text" [(ngModel)]="otp" name="otp" placeholder="123456" maxlength="6" required />
                </div>
                <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
                  @if (loading()) { <span class="spinner"></span> } Verify OTP
                </button>
                <button type="button" class="btn btn-ghost btn-full" style="margin-top:.5rem" (click)="otpSent.set(false)">Back</button>
              </form>
            }
          }
        </div>

        <div class="auth-footer">
          Don't have an account? <a routerLink="/register">Register</a>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private auth = inject(AuthStore);
  private router = inject(Router);

  mode = signal<'password' | 'otp'>('password');
  loading = signal(false);
  error = signal('');
  otpSent = signal(false);
  devOtp = signal('');

  identifier = '';
  password = '';
  otp = '';

  private identifierField() {
    return this.identifier.includes('@') ? { email: this.identifier } : { phone: this.identifier };
  }

  async loginPassword() {
    this.error.set('');
    this.loading.set(true);
    try {
      const user = await this.auth.login({ ...this.identifierField(), password: this.password });
      this.router.navigate([user.isAdmin ? '/admin' : '/']);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Login failed');
    } finally {
      this.loading.set(false);
    }
  }

  async requestOtp() {
    this.error.set('');
    this.loading.set(true);
    try {
      const res = await this.auth.requestOtp(this.identifierField());
      this.devOtp.set(res.otp ?? '');
      this.otpSent.set(true);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Failed to send OTP');
    } finally {
      this.loading.set(false);
    }
  }

  async verifyOtp() {
    this.error.set('');
    this.loading.set(true);
    try {
      const user = await this.auth.loginOtp({ ...this.identifierField(), otp: this.otp });
      this.router.navigate([user.isAdmin ? '/admin' : '/']);
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Invalid OTP');
    } finally {
      this.loading.set(false);
    }
  }
}

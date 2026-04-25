import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-oauth-authorize',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="auth-page">
      <div>
        <div class="auth-logo">
          <div class="brand">পরিচয় Porichoy</div>
          <div class="tagline">Identity & Access Management</div>
        </div>

        <!-- Step 1: Login (if not authenticated) -->
        @if (step() === 'login') {
          <div class="form-card">
            <div style="text-align:center;margin-bottom:1.25rem">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:.5rem">Sign in to continue to</div>
              <div style="font-size:18px;font-weight:600">{{ clientName() || 'Application' }}</div>
            </div>

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
        }

        <!-- Step 2: Consent -->
        @if (step() === 'consent') {
          <div class="form-card">
            <div style="text-align:center;margin-bottom:1.5rem">
              <div style="width:56px;height:56px;background:var(--primary);border-radius:12px;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:24px;color:white">🔗</div>
              <div style="font-size:18px;font-weight:600;margin-bottom:.25rem">{{ clientName() }}</div>
              <div style="font-size:13px;color:var(--text-muted)">wants to access your Porichoy account</div>
            </div>

            <div style="background:var(--bg-primary);border:1px solid var(--border);border-radius:8px;padding:1rem;margin-bottom:1rem">
              <div style="font-size:12px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.75rem">Signed in as</div>
              <div style="display:flex;align-items:center;gap:.75rem">
                <div style="width:40px;height:40px;background:var(--primary);border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:600;font-size:16px">{{ userInitial() }}</div>
                <div>
                  <div style="font-weight:500">{{ auth.user()?.displayName }}</div>
                  <div style="font-size:13px;color:var(--text-muted)">{{ auth.user()?.email }}</div>
                </div>
              </div>
            </div>

            <div style="margin-bottom:1.25rem">
              <div style="font-size:13px;color:var(--text-muted);margin-bottom:.75rem">This app will be able to:</div>
              @for (s of scopeDescriptions(); track s.scope) {
                <div style="display:flex;align-items:center;gap:.5rem;padding:.4rem 0;font-size:14px">
                  <span style="color:var(--primary)">✓</span>
                  <span>{{ s.description }}</span>
                </div>
              }
            </div>

            @if (error()) {
              <div class="alert alert-error">{{ error() }}</div>
            }

            <div style="display:flex;gap:.75rem">
              <button class="btn btn-secondary" style="flex:1" (click)="deny()" [disabled]="loading()">Deny</button>
              <button class="btn btn-primary" style="flex:2" (click)="approve()" [disabled]="loading()">
                @if (loading()) { <span class="spinner"></span> } Allow access
              </button>
            </div>

            <div style="text-align:center;margin-top:1rem;font-size:12px;color:var(--text-muted)">
              You can revoke this access at any time from your settings
            </div>
          </div>
        }

        <!-- Step 3: Redirecting -->
        @if (step() === 'redirecting') {
          <div class="form-card" style="text-align:center">
            <span class="spinner" style="margin-bottom:1rem"></span>
            <div style="font-size:14px;color:var(--text-muted)">Redirecting back to {{ clientName() }}...</div>
          </div>
        }
      </div>
    </div>
  `,
})
export class OAuthAuthorizeComponent implements OnInit {
  auth = inject(AuthStore);
  private api = inject(ApiService);
  private route = inject(ActivatedRoute);

  step = signal<'login' | 'consent' | 'redirecting'>('login');
  mode = signal<'password' | 'otp'>('password');
  loading = signal(false);
  error = signal('');
  otpSent = signal(false);
  devOtp = signal('');
  clientName = signal('');

  // OAuth params from query string
  private clientId = '';
  private redirectUri = '';
  private scope = '';
  private responseType = '';
  private codeChallenge = '';
  private codeChallengeMethod = '';
  private state = '';

  identifier = '';
  password = '';
  otp = '';

  scopeDescriptions = signal<{ scope: string; description: string }[]>([]);

  private scopeMap: Record<string, string> = {
    openid: 'Verify your identity',
    profile: 'View your name and profile info',
    email: 'View your email address',
    entitlements: 'Read your roles and permissions for this app',
  };

  async ngOnInit() {
    const params = this.route.snapshot.queryParams;
    this.clientId = params['client_id'] || '';
    this.redirectUri = params['redirect_uri'] || '';
    this.scope = params['scope'] || 'openid';
    this.responseType = params['response_type'] || 'code';
    this.codeChallenge = params['code_challenge'] || '';
    this.codeChallengeMethod = params['code_challenge_method'] || 'S256';
    this.state = params['state'] || '';

    // Build scope descriptions
    const scopes = this.scope.split(' ').map((s: string) => ({
      scope: s,
      description: this.scopeMap[s] || s,
    }));
    this.scopeDescriptions.set(scopes);

    // Try to fetch client info
    try {
      const res = await this.api.get<any>('/clients/by-client-id/' + this.clientId);
      this.clientName.set(res.clientName || res.client_name || this.clientId);
    } catch {
      this.clientName.set(this.clientId);
    }

    // Check if already logged in
    if (!this.auth.checked()) {
      await this.auth.loadMe();
    }
    if (this.auth.user()) {
      this.step.set('consent');
      await this.tryAutoAuthorize();
    }
  }

  userInitial(): string {
    const name = this.auth.user()?.displayName || '?';
    return name.charAt(0).toUpperCase();
  }

  private identifierField() {
    return this.identifier.includes('@') ? { email: this.identifier } : { phone: this.identifier };
  }

  async loginPassword() {
    this.error.set('');
    this.loading.set(true);
    try {
      await this.auth.login({ ...this.identifierField(), password: this.password });
      this.step.set('consent');
      await this.tryAutoAuthorize();
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
      await this.auth.loginOtp({ ...this.identifierField(), otp: this.otp });
      this.step.set('consent');
      await this.tryAutoAuthorize();
    } catch (e: any) {
      this.error.set(e?.error?.error ?? 'Invalid OTP');
    } finally {
      this.loading.set(false);
    }
  }

  private async tryAutoAuthorize() {
    // Try to authorize — if consent already exists, we skip the consent screen
    try {
      const res = await this.api.get<any>(
        '/oauth/authorize?client_id=' + encodeURIComponent(this.clientId) +
        '&redirect_uri=' + encodeURIComponent(this.redirectUri) +
        '&response_type=' + this.responseType +
        '&scope=' + encodeURIComponent(this.scope) +
        '&code_challenge=' + encodeURIComponent(this.codeChallenge) +
        '&code_challenge_method=' + this.codeChallengeMethod +
        (this.state ? '&state=' + encodeURIComponent(this.state) : '')
      );

      if (res.requiresConsent) {
        // Stay on consent screen
        this.step.set('consent');
      }
      // If we got a redirect, the browser will follow it automatically
    } catch (e: any) {
      // If it's a redirect (which fetch doesn't follow for GET with withCredentials),
      // we need to handle it. For now, stay on consent screen.
      this.step.set('consent');
    }
  }

  async approve() {
    this.error.set('');
    this.loading.set(true);
    try {
      // Post consent approval — backend will return a redirect URL
      const res = await this.api.post<any>('/oauth/authorize/consent', {
        clientId: this.clientId,
        redirectUri: this.redirectUri,
        scope: this.scope,
        responseType: this.responseType,
        codeChallenge: this.codeChallenge,
        codeChallengeMethod: this.codeChallengeMethod,
        state: this.state,
        decision: 'approve',
      });

      // The backend returns a redirect — but since we're using fetch, it won't auto-redirect.
      // We need to manually redirect the browser.
      if (res?.redirectUrl || res?.redirect_url) {
        this.step.set('redirecting');
        window.location.href = res.redirectUrl || res.redirect_url;
      }
    } catch (e: any) {
      // Check if the error is actually a redirect (302)
      // The backend does res.redirect() which won't work with fetch/XHR
      // We need a different approach — use the authorize endpoint directly
      this.error.set(e?.error?.error ?? 'Authorization failed');
    } finally {
      this.loading.set(false);
    }
  }

  deny() {
    const url = new URL(this.redirectUri);
    url.searchParams.set('error', 'access_denied');
    if (this.state) url.searchParams.set('state', this.state);
    window.location.href = url.toString();
  }
}

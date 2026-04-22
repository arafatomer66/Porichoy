import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>OAuth Clients</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Client</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Client</th><th>Client ID</th><th>Type</th><th>Scopes</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="6">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="6">No clients yet</td></tr> }
          @else {
            @for (c of items(); track c['uuid']) {
              <tr>
                <td><strong>{{ c['clientName'] }}</strong></td>
                <td style="font-size:12px;font-family:monospace">{{ c['clientId'] }}</td>
                <td><span class="badge badge-purple">{{ c['clientType'] }}</span></td>
                <td style="font-size:12px">{{ c['allowedScopes']?.join(', ') }}</td>
                <td>{{ c['isActive'] ? '✓' : '—' }}</td>
                <td style="display:flex;gap:.4rem">
                  <button class="btn btn-sm btn-secondary" (click)="rotateSecret(c)">Rotate Secret</button>
                  <button class="btn btn-sm btn-danger" (click)="delete(c)">Delete</button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (newSecret()) {
      <div class="alert alert-info" style="margin-top:1rem">
        New client secret (copy now — not shown again):<br>
        <strong style="font-family:monospace">{{ newSecret() }}</strong>
        <button class="btn btn-sm btn-ghost" style="margin-left:.5rem" (click)="newSecret.set('')">✕</button>
      </div>
    }

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>New OAuth Client</h3>
          <div class="form-group"><label>Client name</label><input [(ngModel)]="form['clientName']" /></div>
          <div class="form-group">
            <label>Client type</label>
            <select [(ngModel)]="form['clientType']"><option value="public">Public (SPA)</option><option value="confidential">Confidential</option></select>
          </div>
          <div class="form-group"><label>Redirect URIs (comma-separated)</label><input [(ngModel)]="form['redirectUris']" /></div>
          <div class="form-group"><label>Allowed scopes (space-separated)</label><input [(ngModel)]="form['allowedScopes']" placeholder="openid profile email entitlements" /></div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } Create
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(false);
  showModal = signal(false);
  saving = signal(false);
  error = signal('');
  newSecret = signal('');
  form: Record<string, any> = {};

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>('/clients')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.form = { clientName: '', clientType: 'public', redirectUris: '', allowedScopes: 'openid profile email entitlements' };
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      const payload = {
        ...this.form,
        redirectUris: this.form['redirectUris'].split(',').map((s: string) => s.trim()).filter(Boolean),
        allowedScopes: this.form['allowedScopes'].split(' ').filter(Boolean),
        grantTypes: ['authorization_code', 'refresh_token'],
        tokenEndpointAuthMethod: this.form['clientType'] === 'public' ? 'none' : 'client_secret_basic',
      };
      const res = await this.api.post<any>('/clients', payload);
      if (res.clientSecret) this.newSecret.set(res.clientSecret);
      this.closeModal(); await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  async rotateSecret(c: any) {
    if (!confirm('Rotate the client secret? The old secret will stop working immediately.')) return;
    const res = await this.api.post<any>(`/clients/${c['uuid']}/rotate-secret`);
    this.newSecret.set(res.clientSecret);
  }

  async delete(c: any) {
    if (!confirm(`Delete client "${c['clientName']}"?`)) return;
    await this.api.delete(`/clients/${c['uuid']}`);
    await this.load();
  }
}

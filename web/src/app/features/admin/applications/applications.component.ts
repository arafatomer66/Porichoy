import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Applications</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Application</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Connector</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="5">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="5">No applications yet</td></tr> }
          @else {
            @for (app of items(); track app['uuid']) {
              <tr>
                <td><strong>{{ app['name'] }}</strong><br><span style="color:var(--text-muted);font-size:12px">{{ app['baseUrl'] }}</span></td>
                <td><span class="badge badge-blue">{{ app['appType'] }}</span></td>
                <td><span class="badge badge-purple">{{ app['connectorType'] }}</span></td>
                <td><span class="badge" [class]="statusBadge(app['status'])">{{ app['status'] }}</span></td>
                <td style="display:flex;gap:.4rem">
                  <button class="btn btn-sm btn-secondary" (click)="openEdit(app)">Edit</button>
                  <button class="btn btn-sm btn-danger" (click)="delete(app)">Delete</button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>{{ editing() ? 'Edit' : 'New' }} Application</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group"><label>Base URL</label><input [(ngModel)]="form['baseUrl']" /></div>
          <div class="form-group">
            <label>App type</label>
            <select [(ngModel)]="form['appType']">
              <option value="web">Web</option><option value="api">API</option><option value="mobile">Mobile</option>
            </select>
          </div>
          <div class="form-group">
            <label>Connector type</label>
            <select [(ngModel)]="form['connectorType']">
              <option value="manual">Manual</option><option value="oidc">OIDC</option><option value="scim">SCIM</option><option value="api">API</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select [(ngModel)]="form['status']"><option value="active">Active</option><option value="inactive">Inactive</option><option value="pending">Pending</option></select>
          </div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="save()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } Save
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ApplicationsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(false);
  showModal = signal(false);
  editing = signal<any>(null);
  saving = signal(false);
  error = signal('');
  form: Record<string, any> = {};

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>('/applications')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', baseUrl: '', appType: 'web', connectorType: 'manual', status: 'active' };
    this.showModal.set(true);
  }

  openEdit(app: any) {
    this.editing.set(app);
    this.form = { ...app };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      if (this.editing()) await this.api.patch(`/applications/${this.editing()['uuid']}`, this.form);
      else await this.api.post('/applications', this.form);
      this.closeModal();
      await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Save failed'); }
    finally { this.saving.set(false); }
  }

  async delete(app: any) {
    if (!confirm(`Delete "${app['name']}"?`)) return;
    await this.api.delete(`/applications/${app['uuid']}`);
    await this.load();
  }

  statusBadge(s: string) {
    return { active: 'badge-green', inactive: 'badge-gray', pending: 'badge-yellow' }[s] ?? 'badge-gray';
  }
}

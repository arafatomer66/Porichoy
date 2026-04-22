import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Roles & Entitlements</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Role</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Role</th><th>Application</th><th>Type</th><th>Requestable</th><th>Max Days</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="6">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="6">No roles yet</td></tr> }
          @else {
            @for (r of items(); track r['uuid']) {
              <tr>
                <td><strong>{{ r['name'] }}</strong><br><span style="color:var(--text-muted);font-size:12px">{{ r['description'] }}</span></td>
                <td>{{ r['application']?.['name'] ?? '(Global)' }}</td>
                <td><span class="badge badge-purple">{{ r['roleType'] }}</span></td>
                <td>{{ r['isRequestable'] ? 'Yes' : 'No' }}</td>
                <td>{{ r['maxDurationDays'] ?? '—' }}</td>
                <td style="display:flex;gap:.4rem">
                  <button class="btn btn-sm btn-secondary" (click)="openEdit(r)">Edit</button>
                  <button class="btn btn-sm btn-danger" (click)="delete(r)">Delete</button>
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
          <h3>{{ editing() ? 'Edit' : 'New' }} Role</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group">
            <label>Role type</label>
            <select [(ngModel)]="form['roleType']">
              <option value="business">Business</option><option value="technical">Technical</option><option value="composite">Composite</option>
            </select>
          </div>
          <div class="form-group">
            <label>Application UUID (optional)</label>
            <input [(ngModel)]="form['applicationUuid']" placeholder="Leave empty for global role" />
          </div>
          <div class="form-group"><label>Max duration (days)</label><input type="number" [(ngModel)]="form['maxDurationDays']" /></div>
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
export class RolesComponent implements OnInit {
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
    try { this.items.set(await this.api.get<any[]>('/roles')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', roleType: 'business', applicationUuid: '', maxDurationDays: null, isRequestable: true };
    this.showModal.set(true);
  }

  openEdit(r: any) {
    this.editing.set(r);
    this.form = { name: r['name'], description: r['description'], roleType: r['roleType'], applicationUuid: r['applicationUuid'] ?? '', maxDurationDays: r['maxDurationDays'], isRequestable: r['isRequestable'] };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      const payload = { ...this.form, applicationUuid: this.form['applicationUuid'] || null, maxDurationDays: this.form['maxDurationDays'] || null };
      if (this.editing()) await this.api.patch(`/roles/${this.editing()['uuid']}`, payload);
      else await this.api.post('/roles', payload);
      this.closeModal();
      await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Save failed'); }
    finally { this.saving.set(false); }
  }

  async delete(r: any) {
    if (!confirm(`Delete role "${r['name']}"?`)) return;
    await this.api.delete(`/roles/${r['uuid']}`);
    await this.load();
  }
}

import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-policies',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Authorization Policies</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Policy</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Resource / Action</th><th>Type</th><th>Effect</th><th>Priority</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="7">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="7">No policies yet</td></tr> }
          @else {
            @for (p of items(); track p['uuid']) {
              <tr>
                <td><strong>{{ p['name'] }}</strong></td>
                <td style="font-size:12px;font-family:monospace">{{ p['resource'] }} → {{ p['action'] }}</td>
                <td><span class="badge badge-purple">{{ p['policyType'] }}</span></td>
                <td><span class="badge" [class]="p['effect']==='allow' ? 'badge-green' : 'badge-red'">{{ p['effect'] }}</span></td>
                <td>{{ p['priority'] }}</td>
                <td>{{ p['isActive'] ? '✓' : '—' }}</td>
                <td style="display:flex;gap:.4rem">
                  <button class="btn btn-sm btn-secondary" (click)="openEdit(p)">Edit</button>
                  <button class="btn btn-sm btn-danger" (click)="delete(p)">Delete</button>
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
          <h3>{{ editing() ? 'Edit' : 'New' }} Policy</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group"><label>Resource</label><input [(ngModel)]="form['resource']" placeholder="gonok:transactions" /></div>
          <div class="form-group"><label>Action</label><input [(ngModel)]="form['action']" placeholder="create" /></div>
          <div class="form-group">
            <label>Type</label>
            <select [(ngModel)]="form['policyType']"><option value="rbac">RBAC</option><option value="abac">ABAC</option></select>
          </div>
          <div class="form-group">
            <label>Effect</label>
            <select [(ngModel)]="form['effect']"><option value="allow">Allow</option><option value="deny">Deny</option></select>
          </div>
          <div class="form-group"><label>Priority</label><input type="number" [(ngModel)]="form['priority']" /></div>
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
export class PoliciesComponent implements OnInit {
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
    try { this.items.set(await this.api.get<any[]>('/authz/policies')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', resource: '', action: '', policyType: 'rbac', effect: 'allow', priority: 0, isActive: true };
    this.showModal.set(true);
  }
  openEdit(p: any) { this.editing.set(p); this.form = { ...p }; this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      if (this.editing()) await this.api.patch(`/authz/policies/${this.editing()['uuid']}`, this.form);
      else await this.api.post('/authz/policies', this.form);
      this.closeModal(); await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Save failed'); }
    finally { this.saving.set(false); }
  }

  async delete(p: any) {
    if (!confirm(`Delete policy "${p['name']}"?`)) return;
    await this.api.delete(`/authz/policies/${p['uuid']}`);
    await this.load();
  }
}

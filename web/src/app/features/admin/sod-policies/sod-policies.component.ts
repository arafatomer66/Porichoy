import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-sod-policies',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Separation of Duties</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New SoD Policy</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Policy</th><th>Role A</th><th>Role B</th><th>Enforcement</th><th>Active</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="6">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="6">No SoD policies yet</td></tr> }
          @else {
            @for (p of items(); track p['uuid']) {
              <tr>
                <td><strong>{{ p['name'] }}</strong><br><span style="color:var(--text-muted);font-size:12px">{{ p['description'] }}</span></td>
                <td style="font-size:12px;font-family:monospace">{{ p['conflictingRoleA'] }}</td>
                <td style="font-size:12px;font-family:monospace">{{ p['conflictingRoleB'] }}</td>
                <td><span class="badge" [class]="p['enforcement']==='prevent' ? 'badge-red' : 'badge-yellow'">{{ p['enforcement'] }}</span></td>
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
          <h3>{{ editing() ? 'Edit' : 'New' }} SoD Policy</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group"><label>Conflicting Role A (UUID)</label><input [(ngModel)]="form['conflictingRoleA']" /></div>
          <div class="form-group"><label>Conflicting Role B (UUID)</label><input [(ngModel)]="form['conflictingRoleB']" /></div>
          <div class="form-group">
            <label>Enforcement</label>
            <select [(ngModel)]="form['enforcement']"><option value="prevent">Prevent</option><option value="warn">Warn</option></select>
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
export class SodPoliciesComponent implements OnInit {
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
    try { this.items.set(await this.api.get<any[]>('/assignments/sod-policies')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', conflictingRoleA: '', conflictingRoleB: '', enforcement: 'prevent', isActive: true };
    this.showModal.set(true);
  }

  openEdit(p: any) { this.editing.set(p); this.form = { ...p }; this.showModal.set(true); }
  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      if (this.editing()) await this.api.patch(`/assignments/sod-policies/${this.editing()['uuid']}`, this.form);
      else await this.api.post('/assignments/sod-policies', this.form);
      this.closeModal(); await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Save failed'); }
    finally { this.saving.set(false); }
  }

  async delete(p: any) {
    if (!confirm(`Delete SoD policy "${p['name']}"?`)) return;
    await this.api.delete(`/assignments/sod-policies/${p['uuid']}`);
    await this.load();
  }
}

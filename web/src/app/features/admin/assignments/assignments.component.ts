import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-assignments',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Role Assignments</h1>
      <button class="btn btn-primary" (click)="openGrant()">+ Grant Role</button>
    </div>

    <div class="search-bar">
      <input type="text" [(ngModel)]="identityUuid" placeholder="Identity UUID to look up…" />
      <button class="btn btn-secondary" (click)="lookup()">Lookup</button>
    </div>

    @if (items().length > 0) {
      <div class="panel">
        <table class="data-table">
          <thead><tr><th>Role</th><th>Application</th><th>Status</th><th>Granted By</th><th>Expires</th><th>Actions</th></tr></thead>
          <tbody>
            @for (a of items(); track a['uuid']) {
              <tr>
                <td><strong>{{ a['role']?.['name'] }}</strong></td>
                <td>{{ a['role']?.['application']?.['name'] ?? '(Global)' }}</td>
                <td><span class="badge" [class]="statusBadge(a['status'])">{{ a['status'] }}</span></td>
                <td style="color:var(--text-muted);font-size:12px">{{ a['grantedBy'] ?? 'system' }}</td>
                <td style="color:var(--text-muted);font-size:12px">{{ a['expiresAt'] ? (a['expiresAt'] | date:'shortDate') : '—' }}</td>
                <td>
                  @if (a['status'] === 'active') {
                    <button class="btn btn-sm btn-danger" (click)="revoke(a)">Revoke</button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Grant Role</h3>
          <div class="form-group"><label>Identity UUID</label><input [(ngModel)]="form['identityUuid']" /></div>
          <div class="form-group"><label>Role UUID</label><input [(ngModel)]="form['roleUuid']" /></div>
          <div class="form-group"><label>Reason</label><input [(ngModel)]="form['grantedReason']" /></div>
          <div class="form-group"><label>Expires at (optional)</label><input type="date" [(ngModel)]="form['expiresAt']" /></div>
          @if (sodWarning()) { <div class="alert alert-info">⚠ SoD warning: {{ sodWarning() }}</div> }
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="grant()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } Grant
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class AssignmentsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(false);
  showModal = signal(false);
  saving = signal(false);
  error = signal('');
  sodWarning = signal('');
  identityUuid = '';
  form: Record<string, any> = {};

  async ngOnInit() {}

  async lookup() {
    if (!this.identityUuid) return;
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>(`/assignments/identities/${this.identityUuid}`)); }
    catch {} finally { this.loading.set(false); }
  }

  openGrant() {
    this.form = { identityUuid: this.identityUuid, roleUuid: '', grantedReason: '', expiresAt: '' };
    this.sodWarning.set('');
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.error.set(''); }

  async grant() {
    this.saving.set(true); this.error.set(''); this.sodWarning.set('');
    try {
      const payload = { ...this.form, expiresAt: this.form['expiresAt'] ? new Date(this.form['expiresAt']) : null };
      const res = await this.api.post<any>('/assignments', payload);
      if (res.sodWarning) this.sodWarning.set(res.sodWarning);
      this.closeModal();
      await this.lookup();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  async revoke(a: any) {
    if (!confirm('Revoke this assignment?')) return;
    await this.api.delete(`/assignments/${a['uuid']}`);
    await this.lookup();
  }

  statusBadge(s: string) {
    return { active: 'badge-green', revoked: 'badge-red', expired: 'badge-gray', pending: 'badge-yellow' }[s] ?? 'badge-gray';
  }
}

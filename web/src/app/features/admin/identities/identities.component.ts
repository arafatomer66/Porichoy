import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-identities',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Identities</h1>
    </div>

    <div class="search-bar">
      <input type="text" [(ngModel)]="search" placeholder="Search by name or email…" (input)="load()" />
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Email / Phone</th><th>Type</th><th>Status</th><th>Admin</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) {
            <tr class="loading-row"><td colspan="6">Loading…</td></tr>
          } @else if (items().length === 0) {
            <tr class="loading-row"><td colspan="6">No identities found</td></tr>
          } @else {
            @for (id of items(); track id['uuid']) {
              <tr>
                <td><strong>{{ id['displayName'] }}</strong></td>
                <td style="color:var(--text-muted)">{{ id['email'] ?? id['phone'] }}</td>
                <td><span class="badge badge-blue">{{ id['identityType'] }}</span></td>
                <td><span class="badge" [class]="statusBadge(id['status'])">{{ id['status'] }}</span></td>
                <td>{{ id['isAdmin'] ? '✓' : '—' }}</td>
                <td style="display:flex;gap:.4rem">
                  @if (id['status'] === 'active') {
                    <button class="btn btn-sm btn-danger" (click)="lock(id)">Lock</button>
                  } @else if (id['status'] === 'locked') {
                    <button class="btn btn-sm btn-secondary" (click)="unlock(id)">Unlock</button>
                  }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
      <div style="padding:.75rem 1rem;border-top:1px solid var(--border);color:var(--text-muted);font-size:12px">
        {{ total() }} total
      </div>
    </div>
  `,
})
export class IdentitiesComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  total = signal(0);
  loading = signal(false);
  search = '';

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const q = this.search ? `&search=${encodeURIComponent(this.search)}` : '';
      const res = await this.api.get<{ items: any[]; total: number }>(`/identities?limit=50${q}`);
      this.items.set(res.items);
      this.total.set(res.total);
    } catch {} finally { this.loading.set(false); }
  }

  async lock(id: any) {
    await this.api.post(`/identities/${id['uuid']}/lock`);
    await this.load();
  }

  async unlock(id: any) {
    await this.api.post(`/identities/${id['uuid']}/unlock`);
    await this.load();
  }

  statusBadge(s: string) {
    return { active: 'badge-green', inactive: 'badge-gray', locked: 'badge-red', pending: 'badge-yellow' }[s] ?? 'badge-gray';
  }
}

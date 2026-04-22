import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-audit',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Audit Logs</h1>
    </div>

    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-bottom:1rem">
      <input style="flex:2;min-width:160px;padding:.55rem .75rem;border:1px solid var(--border);border-radius:var(--radius);outline:none"
             type="text" [(ngModel)]="filters['action']" placeholder="Filter by action…" />
      <input style="flex:2;min-width:160px;padding:.55rem .75rem;border:1px solid var(--border);border-radius:var(--radius);outline:none"
             type="text" [(ngModel)]="filters['resourceType']" placeholder="Resource type…" />
      <input style="flex:2;min-width:160px;padding:.55rem .75rem;border:1px solid var(--border);border-radius:var(--radius);outline:none"
             type="text" [(ngModel)]="filters['actorUuid']" placeholder="Actor UUID…" />
      <button class="btn btn-secondary" (click)="load()">Filter</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Action</th><th>Resource</th><th>Actor</th><th>IP</th><th>When</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="5">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="5">No events</td></tr> }
          @else {
            @for (a of items(); track a['uuid']) {
              <tr>
                <td><span class="badge badge-blue">{{ a['action'] }}</span></td>
                <td>
                  <span style="color:var(--text-muted);font-size:12px">{{ a['resourceType'] }}</span>
                  @if (a['resourceUuid']) {
                    <br><span style="font-family:monospace;font-size:11px;color:var(--text-muted)">{{ a['resourceUuid'] }}</span>
                  }
                </td>
                <td style="font-family:monospace;font-size:11px;color:var(--text-muted)">{{ a['actorUuid'] ?? 'system' }}</td>
                <td style="font-size:12px;color:var(--text-muted)">{{ a['ipAddress'] ?? '—' }}</td>
                <td style="font-size:12px;color:var(--text-muted)">{{ a['timestamp'] | date:'medium' }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1rem;border-top:1px solid var(--border)">
        <span style="color:var(--text-muted);font-size:12px">{{ total() }} total events</span>
        <div style="display:flex;gap:.5rem">
          <button class="btn btn-sm btn-secondary" [disabled]="offset() === 0" (click)="prev()">← Prev</button>
          <button class="btn btn-sm btn-secondary" [disabled]="offset() + limit >= total()" (click)="next()">Next →</button>
        </div>
      </div>
    </div>
  `,
})
export class AuditComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  total = signal(0);
  loading = signal(false);
  offset = signal(0);
  limit = 50;
  filters: Record<string, string> = { action: '', resourceType: '', actorUuid: '' };

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try {
      const q = new URLSearchParams({ limit: String(this.limit), offset: String(this.offset()) });
      Object.entries(this.filters).forEach(([k, v]) => { if (v) q.set(k, v); });
      const res = await this.api.get<{ items: any[]; total: number }>(`/audit?${q}`);
      this.items.set(res.items);
      this.total.set(res.total);
    } catch {} finally { this.loading.set(false); }
  }

  prev() { this.offset.set(Math.max(0, this.offset() - this.limit)); this.load(); }
  next() { this.offset.set(this.offset() + this.limit); this.load(); }
}

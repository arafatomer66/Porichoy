import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <div class="page-header"><h1>Dashboard</h1></div>

    <div class="stats-grid">
      @for (s of stats(); track s.label) {
        <div class="stat-card">
          <div class="stat-label">{{ s.label }}</div>
          <div class="stat-value">{{ s.value }}</div>
        </div>
      }
    </div>

    <div class="panel" style="padding:1.25rem">
      <h3 style="margin:0 0 .5rem;font-size:14px;color:var(--text-muted)">Recent audit events</h3>
      @if (audit().length === 0) {
        <div class="empty-state"><div class="empty-icon">📋</div>No events yet</div>
      } @else {
        <table class="data-table">
          <thead><tr><th>Action</th><th>Resource</th><th>When</th></tr></thead>
          <tbody>
            @for (a of audit(); track a['uuid']) {
              <tr>
                <td>{{ a['action'] }}</td>
                <td>{{ a['resourceType'] }}</td>
                <td style="color:var(--text-muted);font-size:12px">{{ a['timestamp'] | date:'short' }}</td>
              </tr>
            }
          </tbody>
        </table>
      }
    </div>
  `,
  imports: [DatePipe],
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  stats = signal<{ label: string; value: number }[]>([]);
  audit = signal<any[]>([]);

  async ngOnInit() {
    await Promise.allSettled([this.loadStats(), this.loadAudit()]);
  }

  private async loadStats() {
    try {
      const [identities, apps, roles, reviews] = await Promise.allSettled([
        this.api.get<any>('/identities?limit=1'),
        this.api.get<any[]>('/applications'),
        this.api.get<any[]>('/roles'),
        this.api.get<any[]>('/reviews'),
      ]);
      this.stats.set([
        { label: 'Identities',   value: identities.status === 'fulfilled' ? identities.value.total : 0 },
        { label: 'Applications', value: apps.status === 'fulfilled' ? apps.value.length : 0 },
        { label: 'Roles',        value: roles.status === 'fulfilled' ? roles.value.length : 0 },
        { label: 'Open Reviews', value: reviews.status === 'fulfilled' ? reviews.value.filter((r: any) => r.status === 'open').length : 0 },
      ]);
    } catch {}
  }

  private async loadAudit() {
    try {
      const res = await this.api.get<{ items: any[] }>('/audit?limit=8');
      this.audit.set(res.items);
    } catch {}
  }
}

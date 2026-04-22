import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-lifecycle',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="page-header">
      <h1>Lifecycle Events</h1>
      <button class="btn btn-primary" (click)="openTrigger()">+ Trigger Event</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Identity</th><th>Event</th><th>Source</th><th>Status</th><th>Triggered</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="5">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="5">No events yet</td></tr> }
          @else {
            @for (e of items(); track e['uuid']) {
              <tr>
                <td style="font-size:12px;font-family:monospace">{{ e['identityUuid'] }}</td>
                <td><span class="badge" [class]="typeBadge(e['eventType'])">{{ e['eventType'] }}</span></td>
                <td style="color:var(--text-muted)">{{ e['source'] }}</td>
                <td><span class="badge" [class]="statusBadge(e['status'])">{{ e['status'] }}</span></td>
                <td style="color:var(--text-muted);font-size:12px">{{ e['createdAt'] | date:'short' }}</td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>Trigger Lifecycle Event</h3>
          <div class="form-group"><label>Identity UUID</label><input [(ngModel)]="form['identityUuid']" /></div>
          <div class="form-group">
            <label>Event type</label>
            <select [(ngModel)]="form['eventType']">
              <option value="joiner">Joiner</option>
              <option value="mover">Mover</option>
              <option value="leaver">Leaver</option>
            </select>
          </div>
          <div class="form-group"><label>Source</label><input [(ngModel)]="form['source']" placeholder="manual" /></div>
          @if (error()) { <div class="alert alert-error">{{ error() }}</div> }
          @if (successMsg()) { <div class="alert alert-success">{{ successMsg() }}</div> }
          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeModal()">Cancel</button>
            <button class="btn btn-primary" (click)="trigger()" [disabled]="saving()">
              @if (saving()) { <span class="spinner"></span> } Trigger
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class LifecycleComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(false);
  showModal = signal(false);
  saving = signal(false);
  error = signal('');
  successMsg = signal('');
  form: Record<string, any> = {};

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>('/lifecycle')); }
    catch {} finally { this.loading.set(false); }
  }

  openTrigger() {
    this.form = { identityUuid: '', eventType: 'joiner', source: 'manual' };
    this.error.set(''); this.successMsg.set('');
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }

  async trigger() {
    this.saving.set(true); this.error.set('');
    try {
      await this.api.post('/lifecycle', this.form);
      this.successMsg.set('Event triggered!');
      setTimeout(() => { this.closeModal(); this.load(); }, 1000);
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  typeBadge(t: string)   { return { joiner: 'badge-green', mover: 'badge-blue', leaver: 'badge-red' }[t] ?? 'badge-gray'; }
  statusBadge(s: string) { return { completed: 'badge-green', failed: 'badge-red', pending: 'badge-yellow', processing: 'badge-blue' }[s] ?? 'badge-gray'; }
}

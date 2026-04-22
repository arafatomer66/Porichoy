import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page-header">
      <h1>Access Reviews</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Campaign</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Campaign</th><th>Reviewer</th><th>Due Date</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="5">Loading…</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="5">No campaigns yet</td></tr> }
          @else {
            @for (r of items(); track r['uuid']) {
              <tr>
                <td><strong>{{ r['name'] }}</strong><br><span style="color:var(--text-muted);font-size:12px">{{ r['description'] }}</span></td>
                <td style="font-size:12px">{{ r['reviewer']?.['displayName'] }}</td>
                <td style="font-size:12px">{{ r['dueDate'] }}</td>
                <td><span class="badge" [class]="statusBadge(r['status'])">{{ r['status'] }}</span></td>
                <td style="display:flex;gap:.4rem">
                  @if (r['status'] === 'open' || r['status'] === 'in_progress') {
                    <button class="btn btn-sm btn-secondary" (click)="viewItems(r)">Review Items</button>
                    <button class="btn btn-sm btn-primary" (click)="complete(r)">Complete</button>
                    <button class="btn btn-sm btn-danger" (click)="cancel(r)">Cancel</button>
                  }
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    @if (activeReview()) {
      <div style="margin-top:1.5rem">
        <div class="page-header">
          <h1 style="font-size:16px">Items — {{ activeReview()['name'] }}</h1>
          <button class="btn btn-ghost btn-sm" (click)="activeReview.set(null)">Close</button>
        </div>
        <div class="panel">
          <table class="data-table">
            <thead><tr><th>Identity</th><th>Role</th><th>Decision</th><th>Actions</th></tr></thead>
            <tbody>
              @if (reviewItems().length === 0) { <tr class="loading-row"><td colspan="4">No items</td></tr> }
              @else {
                @for (item of reviewItems(); track item['uuid']) {
                  <tr>
                    <td>{{ item['identity']?.['displayName'] }}</td>
                    <td>{{ item['role']?.['name'] }}</td>
                    <td><span class="badge" [class]="decisionBadge(item['decision'])">{{ item['decision'] }}</span></td>
                    <td style="display:flex;gap:.4rem">
                      @if (item['decision'] === 'pending') {
                        <button class="btn btn-sm btn-primary" (click)="decide(item, 'approve')">Approve</button>
                        <button class="btn btn-sm btn-danger" (click)="decide(item, 'revoke')">Revoke</button>
                      }
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3>New Review Campaign</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group"><label>Reviewer UUID</label><input [(ngModel)]="form['reviewerUuid']" /></div>
          <div class="form-group"><label>Due Date</label><input type="date" [(ngModel)]="form['dueDate']" /></div>
          <div class="form-group"><label>Application UUID (optional)</label><input [(ngModel)]="form['applicationUuid']" /></div>
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
export class ReviewsComponent implements OnInit {
  private api = inject(ApiService);
  items = signal<any[]>([]);
  loading = signal(false);
  showModal = signal(false);
  saving = signal(false);
  error = signal('');
  form: Record<string, any> = {};
  activeReview = signal<any>(null);
  reviewItems = signal<any[]>([]);

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>('/reviews')); }
    catch {} finally { this.loading.set(false); }
  }

  openCreate() {
    this.form = { name: '', description: '', reviewerUuid: '', dueDate: '', applicationUuid: '' };
    this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      const payload = { ...this.form, applicationUuid: this.form['applicationUuid'] || null };
      await this.api.post('/reviews', payload);
      this.closeModal(); await this.load();
    } catch (e: any) { this.error.set(e?.error?.error ?? 'Failed'); }
    finally { this.saving.set(false); }
  }

  async viewItems(r: any) {
    this.activeReview.set(r);
    const items = await this.api.get<any[]>(`/reviews/${r['uuid']}/items`);
    this.reviewItems.set(items);
  }

  async decide(item: any, decision: string) {
    await this.api.patch(`/reviews/items/${item['uuid']}/decide`, { decision, comments: '' });
    await this.viewItems(this.activeReview());
    await this.load();
  }

  async complete(r: any) {
    await this.api.post(`/reviews/${r['uuid']}/complete`);
    await this.load();
  }

  async cancel(r: any) {
    if (!confirm('Cancel this review campaign?')) return;
    await this.api.post(`/reviews/${r['uuid']}/cancel`);
    await this.load();
  }

  statusBadge(s: string) {
    return { open: 'badge-blue', in_progress: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-gray' }[s] ?? 'badge-gray';
  }
  decisionBadge(d: string) {
    return { approve: 'badge-green', revoke: 'badge-red', pending: 'badge-yellow' }[d] ?? 'badge-gray';
  }
}

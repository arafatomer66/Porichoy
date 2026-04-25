import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-applications',
  standalone: true,
  imports: [FormsModule, JsonPipe],
  template: `
    <div class="page-header">
      <h1>Applications</h1>
      <button class="btn btn-primary" (click)="openCreate()">+ New Application</button>
    </div>

    <div class="panel">
      <table class="data-table">
        <thead><tr><th>Name</th><th>Type</th><th>Connector</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          @if (loading()) { <tr class="loading-row"><td colspan="5">Loading...</td></tr> }
          @else if (items().length === 0) { <tr class="loading-row"><td colspan="5">No applications yet</td></tr> }
          @else {
            @for (app of items(); track app['uuid']) {
              <tr>
                <td><strong>{{ app['name'] }}</strong><br><span style="color:var(--text-muted);font-size:12px">{{ app['baseUrl'] }}</span></td>
                <td><span class="badge badge-blue">{{ app['appType'] }}</span></td>
                <td><span class="badge badge-purple">{{ app['connectorType'] }}</span></td>
                <td><span class="badge" [class]="statusBadge(app['status'])">{{ app['status'] }}</span></td>
                <td style="display:flex;gap:.4rem;flex-wrap:wrap">
                  <button class="btn btn-sm btn-primary" (click)="openApiSync(app)">Sync from API</button>
                  <button class="btn btn-sm btn-secondary" (click)="openSync(app)">Manual Sync</button>
                  <button class="btn btn-sm btn-secondary" (click)="openEdit(app)">Edit</button>
                  <button class="btn btn-sm btn-danger" (click)="delete(app)">Delete</button>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>

    <!-- Create/Edit Application Modal -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()" style="max-width:600px">
          <h3>{{ editing() ? 'Edit' : 'New' }} Application</h3>
          <div class="form-group"><label>Name</label><input [(ngModel)]="form['name']" /></div>
          <div class="form-group"><label>Description</label><input [(ngModel)]="form['description']" /></div>
          <div class="form-group"><label>Base URL</label><input [(ngModel)]="form['baseUrl']" placeholder="http://localhost:5050" /></div>
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

          @if (form['connectorType'] !== 'manual') {
            <hr style="border:none;border-top:1px solid var(--border-color);margin:1rem 0" />
            <h4 style="margin:0 0 .5rem">Connector Config</h4>
            <div class="form-group">
              <label>Users API endpoint</label>
              <input [(ngModel)]="connectorConfig['usersEndpoint']" placeholder="/api/users" />
            </div>
            <div class="form-group">
              <label>Response JSON path to users array</label>
              <input [(ngModel)]="connectorConfig['usersPath']" placeholder="users (or data.users, etc.)" />
            </div>
            <div class="form-group">
              <label>Auth header (optional)</label>
              <input [(ngModel)]="connectorConfig['authHeader']" placeholder="Bearer your-api-key" />
            </div>
          }

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

    <!-- Sync from API Modal -->
    @if (showApiSyncModal()) {
      <div class="modal-overlay" (click)="closeApiSyncModal()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()" style="max-width:750px">
          <h3>Sync from API — {{ apiSyncApp()?.['name'] }}</h3>

          <!-- Step 1: Test Connection -->
          @if (apiSyncStep() === 'connect') {
            <p style="color:var(--text-muted);font-size:13px;margin-bottom:1rem">
              Connect to <strong>{{ apiSyncApp()?.['baseUrl'] }}</strong> to discover available user fields.
            </p>
            <button class="btn btn-primary" (click)="testConnection()" [disabled]="previewLoading()">
              @if (previewLoading()) { <span class="spinner"></span> } Test Connection
            </button>
            @if (apiSyncError()) { <div class="alert alert-error" style="margin-top:.75rem">{{ apiSyncError() }}</div> }
          }

          <!-- Step 2: Field Mapping -->
          @if (apiSyncStep() === 'map') {
            <div style="background:var(--bg-secondary);padding:.75rem 1rem;border-radius:8px;font-size:13px;margin-bottom:1rem">
              <span class="badge badge-green">Connected</span>
              <strong style="margin-left:.5rem">{{ preview()?.totalUsers }} users</strong> found at {{ preview()?.url }}
            </div>

            <!-- Sample data preview -->
            <h4 style="margin:0 0 .5rem">Sample Data from App</h4>
            <div style="background:#1a1a2e;color:#e0e0e0;padding:.75rem;border-radius:6px;font-family:monospace;font-size:12px;overflow-x:auto;max-height:120px;margin-bottom:1rem">
              <pre style="margin:0">{{ preview()?.sampleUser | json }}</pre>
            </div>

            <!-- Field Mapping -->
            <h4 style="margin:0 0 .25rem">Field Mapping</h4>
            <p style="color:var(--text-muted);font-size:12px;margin-bottom:.5rem">
              Map the app's fields to Porichoy identity fields. Select which field from the app corresponds to each Porichoy field.
            </p>
            <table class="data-table" style="font-size:13px">
              <thead><tr><th style="width:40%">Porichoy Field</th><th>App Field</th><th>Sample Value</th></tr></thead>
              <tbody>
                @for (m of fieldMappings; track m.porichoyField) {
                  <tr>
                    <td>
                      <strong>{{ m.label }}</strong>
                      @if (m.required) { <span style="color:var(--color-error)">*</span> }
                    </td>
                    <td>
                      <select [(ngModel)]="m.appField" (ngModelChange)="updateSampleValues()" style="width:100%;padding:4px 6px;font-size:13px">
                        <option value="">— not mapped —</option>
                        @for (f of preview()?.fields; track f) {
                          <option [value]="f">{{ f }}</option>
                        }
                      </select>
                    </td>
                    <td style="color:var(--text-muted);font-size:12px;font-family:monospace">
                      {{ m.sampleValue || '—' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>

            <!-- Role Mapping -->
            @if (apiSyncRoles().length > 0 && getRoleMappingField()) {
              <h4 style="margin:1rem 0 .25rem">Role Mapping</h4>
              <p style="color:var(--text-muted);font-size:12px;margin-bottom:.5rem">
                Map app role values to Porichoy roles. These values were found in the "{{ getRoleMappingField() }}" field.
              </p>
              <table class="data-table" style="font-size:13px">
                <thead><tr><th>App Role Value</th><th>Porichoy Role</th></tr></thead>
                <tbody>
                  @for (rm of roleMappings; track $index) {
                    <tr>
                      <td><code style="background:var(--bg-secondary);padding:2px 6px;border-radius:4px">{{ rm.appRole }}</code></td>
                      <td>
                        <select [(ngModel)]="rm.porichoyRole" style="width:100%;padding:4px 6px;font-size:13px">
                          <option value="">— skip —</option>
                          @for (role of apiSyncRoles(); track role['uuid']) {
                            <option [value]="role['name']">{{ role['name'] }}</option>
                          }
                        </select>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            } @else if (apiSyncRoles().length === 0) {
              <div class="alert alert-error" style="margin-top:1rem;font-size:13px">
                No roles defined for this app yet. Create roles under the Roles page first, then come back.
              </div>
            }

            @if (apiSyncError()) { <div class="alert alert-error" style="margin-top:.75rem">{{ apiSyncError() }}</div> }

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="apiSyncStep.set('connect')">Back</button>
              <button class="btn btn-primary" (click)="executeApiSync()" [disabled]="apiSyncing()">
                @if (apiSyncing()) { <span class="spinner"></span> } Sync {{ preview()?.totalUsers }} Users
              </button>
            </div>
          }

          <!-- Step 3: Results -->
          @if (apiSyncStep() === 'results') {
            <div style="padding:1rem;background:var(--bg-secondary);border-radius:8px;font-size:13px">
              <h4 style="margin:0 0 .75rem">Sync Complete</h4>
              <div><strong>{{ apiSyncResult().fetchedCount }}</strong> users fetched from API</div>
              <div style="display:flex;gap:1.5rem;flex-wrap:wrap;margin-top:.75rem">
                <div><span class="badge badge-green" style="font-size:14px;padding:4px 12px">{{ apiSyncResult().created.length }} created</span></div>
                <div><span class="badge badge-blue" style="font-size:14px;padding:4px 12px">{{ apiSyncResult().correlated.length }} correlated</span></div>
                <div><span class="badge badge-purple" style="font-size:14px;padding:4px 12px">{{ apiSyncResult().rolesAssigned.length }} roles assigned</span></div>
                @if (apiSyncResult().errors.length > 0) {
                  <div><span class="badge badge-red" style="font-size:14px;padding:4px 12px">{{ apiSyncResult().errors.length }} errors</span></div>
                }
              </div>

              @if (apiSyncResult().created.length > 0) {
                <div style="margin-top:1rem">
                  <strong>Created:</strong>
                  @for (u of apiSyncResult().created; track u.uuid) {
                    <div style="margin-left:.5rem;margin-top:.25rem">{{ u.displayName }} &lt;{{ u.email }}&gt;</div>
                  }
                </div>
              }
              @if (apiSyncResult().correlated.length > 0) {
                <div style="margin-top:.75rem">
                  <strong>Correlated (already existed):</strong>
                  @for (u of apiSyncResult().correlated; track u.uuid) {
                    <div style="margin-left:.5rem;margin-top:.25rem">{{ u.displayName }} &lt;{{ u.email }}&gt;</div>
                  }
                </div>
              }
              @if (apiSyncResult().rolesAssigned.length > 0) {
                <div style="margin-top:.75rem">
                  <strong>Roles assigned:</strong>
                  @for (r of apiSyncResult().rolesAssigned; track $index) {
                    <div style="margin-left:.5rem;margin-top:.25rem">{{ r.roleName }}</div>
                  }
                </div>
              }
              @if (apiSyncResult().errors.length > 0) {
                <div style="margin-top:.75rem;color:var(--color-error)">
                  <strong>Errors:</strong>
                  @for (err of apiSyncResult().errors; track $index) {
                    <div style="margin-left:.5rem">{{ err.entry?.email || err.entry?.displayName }}: {{ err.error }}</div>
                  }
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeApiSyncModal()">Done</button>
            </div>
          }

          @if (apiSyncStep() === 'connect') {
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeApiSyncModal()">Cancel</button>
            </div>
          }
        </div>
      </div>
    }

    <!-- Manual Sync Users Modal -->
    @if (showSyncModal()) {
      <div class="modal-overlay" (click)="closeSyncModal()">
        <div class="modal modal-lg" (click)="$event.stopPropagation()" style="max-width:720px">
          <h3>Manual Sync — {{ syncApp()?.['name'] }}</h3>
          <p style="color:var(--text-muted);font-size:13px;margin-bottom:1rem">
            Manually import users. Existing users are matched by email and correlated automatically.
          </p>

          <div style="display:flex;gap:.5rem;margin-bottom:1rem">
            <button class="btn btn-sm" [class.btn-primary]="syncMode() === 'form'" [class.btn-secondary]="syncMode() !== 'form'" (click)="syncMode.set('form')">Manual Entry</button>
            <button class="btn btn-sm" [class.btn-primary]="syncMode() === 'json'" [class.btn-secondary]="syncMode() !== 'json'" (click)="syncMode.set('json')">Paste JSON</button>
            <button class="btn btn-sm" [class.btn-primary]="syncMode() === 'csv'" [class.btn-secondary]="syncMode() !== 'csv'" (click)="syncMode.set('csv')">Paste CSV</button>
          </div>

          @if (syncMode() === 'form') {
            <div style="max-height:300px;overflow-y:auto">
              <table class="data-table" style="font-size:13px">
                <thead><tr><th>Name</th><th>Email</th><th>Password</th><th>Role</th><th></th></tr></thead>
                <tbody>
                  @for (row of syncRows; track $index) {
                    <tr>
                      <td><input [(ngModel)]="row.displayName" placeholder="Full Name" style="width:100%;padding:4px 6px;font-size:13px" /></td>
                      <td><input [(ngModel)]="row.email" placeholder="email" style="width:100%;padding:4px 6px;font-size:13px" /></td>
                      <td><input [(ngModel)]="row.password" placeholder="optional" style="width:100%;padding:4px 6px;font-size:13px" /></td>
                      <td>
                        <select [(ngModel)]="row.roleName" style="width:100%;padding:4px 6px;font-size:13px">
                          <option value="">-- none --</option>
                          @for (role of syncRoles(); track role['uuid']) {
                            <option [value]="role['name']">{{ role['name'] }}</option>
                          }
                        </select>
                      </td>
                      <td><button class="btn btn-sm btn-danger" (click)="removeRow($index)" style="padding:2px 8px">x</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            <button class="btn btn-sm btn-secondary" (click)="addRow()" style="margin-top:.5rem">+ Add Row</button>
          }

          @if (syncMode() === 'json') {
            <div class="form-group">
              <label>Paste JSON array</label>
              <textarea [(ngModel)]="syncJson" rows="8" style="font-family:monospace;font-size:12px;width:100%" placeholder='[{"displayName":"Sara","email":"sara@example.com","roleName":"Editor"}]'></textarea>
            </div>
          }

          @if (syncMode() === 'csv') {
            <div class="form-group">
              <label>Paste CSV (columns: displayName, email, password, roleName)</label>
              <textarea [(ngModel)]="syncCsv" rows="8" style="font-family:monospace;font-size:12px;width:100%" placeholder="displayName,email,password,roleName
Sara Khan,sara@example.com,pass123,Editor"></textarea>
            </div>
          }

          @if (syncError()) { <div class="alert alert-error" style="margin-top:.5rem">{{ syncError() }}</div> }

          @if (syncResult()) {
            <div style="margin-top:1rem;padding:1rem;background:var(--bg-secondary);border-radius:8px;font-size:13px">
              <h4 style="margin:0 0 .5rem">Sync Results</h4>
              <div style="display:flex;gap:1.5rem;flex-wrap:wrap">
                <div><span class="badge badge-green">{{ syncResult().created.length }} created</span></div>
                <div><span class="badge badge-blue">{{ syncResult().correlated.length }} correlated</span></div>
                <div><span class="badge badge-purple">{{ syncResult().rolesAssigned.length }} roles assigned</span></div>
                @if (syncResult().errors.length > 0) { <div><span class="badge badge-red">{{ syncResult().errors.length }} errors</span></div> }
              </div>
            </div>
          }

          <div class="modal-footer">
            <button class="btn btn-secondary" (click)="closeSyncModal()">Close</button>
            <button class="btn btn-primary" (click)="executeSyncUsers()" [disabled]="syncing()">
              @if (syncing()) { <span class="spinner"></span> } Sync Users
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
  connectorConfig: Record<string, string> = {};

  // Manual sync
  showSyncModal = signal(false);
  syncApp = signal<any>(null);
  syncRoles = signal<any[]>([]);
  syncMode = signal<'form' | 'json' | 'csv'>('form');
  syncRows: { displayName: string; email: string; password: string; roleName: string }[] = [];
  syncJson = '';
  syncCsv = '';
  syncing = signal(false);
  syncError = signal('');
  syncResult = signal<any>(null);

  // API sync
  showApiSyncModal = signal(false);
  apiSyncApp = signal<any>(null);
  apiSyncStep = signal<'connect' | 'map' | 'results'>('connect');
  apiSyncRoles = signal<any[]>([]);
  preview = signal<any>(null);
  previewLoading = signal(false);
  fieldMappings: { porichoyField: string; label: string; required: boolean; appField: string; sampleValue: string }[] = [];
  roleMappings: { appRole: string; porichoyRole: string }[] = [];
  apiSyncing = signal(false);
  apiSyncError = signal('');
  apiSyncResult = signal<any>(null);

  async ngOnInit() { await this.load(); }

  async load() {
    this.loading.set(true);
    try { this.items.set(await this.api.get<any[]>('/applications')); }
    catch {} finally { this.loading.set(false); }
  }

  // --- Create/Edit ---

  openCreate() {
    this.editing.set(null);
    this.form = { name: '', description: '', baseUrl: '', appType: 'web', connectorType: 'api', status: 'active' };
    this.connectorConfig = { usersEndpoint: '/api/users', usersPath: 'users', authHeader: '' };
    this.showModal.set(true);
  }

  openEdit(app: any) {
    this.editing.set(app);
    this.form = { ...app };
    const cc = app['connectorConfig'] ?? {};
    this.connectorConfig = {
      usersEndpoint: cc.usersEndpoint ?? '/api/users',
      usersPath: cc.usersPath ?? 'users',
      authHeader: cc.authHeader ?? '',
    };
    this.showModal.set(true);
  }

  closeModal() { this.showModal.set(false); this.error.set(''); }

  async save() {
    this.saving.set(true); this.error.set('');
    try {
      if (this.form['connectorType'] !== 'manual') {
        this.form['connectorConfig'] = {
          usersEndpoint: this.connectorConfig['usersEndpoint'] || '/api/users',
          usersPath: this.connectorConfig['usersPath'] || 'users',
          authHeader: this.connectorConfig['authHeader'] || undefined,
          // fieldMap will be set during sync (Test Connection step)
        };
      }
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

  // --- API Sync ---

  async openApiSync(app: any) {
    this.apiSyncApp.set(app);
    this.apiSyncStep.set('connect');
    this.apiSyncError.set('');
    this.apiSyncResult.set(null);
    this.preview.set(null);
    this.fieldMappings = [];
    this.roleMappings = [];
    this.showApiSyncModal.set(true);

    try {
      const roles = await this.api.get<any[]>(`/applications/${app['uuid']}/roles`);
      this.apiSyncRoles.set(roles);
    } catch { this.apiSyncRoles.set([]); }
  }

  closeApiSyncModal() {
    this.showApiSyncModal.set(false);
    this.apiSyncResult.set(null);
    this.apiSyncError.set('');
    this.preview.set(null);
  }

  async testConnection() {
    this.previewLoading.set(true);
    this.apiSyncError.set('');

    try {
      const data = await this.api.get<any>(`/applications/${this.apiSyncApp()['uuid']}/preview-users`);
      this.preview.set(data);

      // Build field mappings with smart auto-detection
      const fields: string[] = data.fields ?? [];
      const sample = data.sampleUser ?? {};

      this.fieldMappings = [
        { porichoyField: 'displayName', label: 'Display Name', required: true, appField: this.autoDetect(fields, ['name', 'displayName', 'display_name', 'full_name', 'fullName', 'firstName']), sampleValue: '' },
        { porichoyField: 'email', label: 'Email', required: true, appField: this.autoDetect(fields, ['email', 'emailAddress', 'email_address', 'mail', 'e_mail']), sampleValue: '' },
        { porichoyField: 'phone', label: 'Phone', required: false, appField: this.autoDetect(fields, ['phone', 'phoneNumber', 'phone_number', 'mobile', 'tel']), sampleValue: '' },
        { porichoyField: 'role', label: 'Role', required: false, appField: this.autoDetect(fields, ['role', 'userRole', 'user_role', 'position', 'type', 'userType']), sampleValue: '' },
      ];
      this.updateSampleValues();

      // Build role mappings from discovered role values
      const roleValues: string[] = data.roleValues ?? [];
      this.roleMappings = roleValues.map(v => ({ appRole: v, porichoyRole: '' }));

      this.apiSyncStep.set('map');
    } catch (e: any) {
      this.apiSyncError.set(e?.error?.error ?? 'Connection failed');
    } finally {
      this.previewLoading.set(false);
    }
  }

  autoDetect(fields: string[], candidates: string[]): string {
    // Exact match first
    for (const c of candidates) {
      if (fields.includes(c)) return c;
    }
    // Case-insensitive match
    for (const c of candidates) {
      const match = fields.find(f => f.toLowerCase() === c.toLowerCase());
      if (match) return match;
    }
    // Partial match (field contains candidate)
    for (const c of candidates) {
      const match = fields.find(f => f.toLowerCase().includes(c.toLowerCase()));
      if (match) return match;
    }
    return '';
  }

  updateSampleValues() {
    const sample = this.preview()?.sampleUser;
    if (!sample) return;
    for (const m of this.fieldMappings) {
      if (m.appField) {
        m.sampleValue = this.resolveField(sample, m.appField) ?? '';
      } else {
        m.sampleValue = '';
      }
    }
  }

  resolveField(obj: any, path: string): any {
    return path.split('.').reduce((o, k) => o?.[k], obj);
  }

  getRoleMappingField(): string {
    return this.fieldMappings.find(m => m.porichoyField === 'role')?.appField ?? '';
  }

  async executeApiSync() {
    this.apiSyncing.set(true);
    this.apiSyncError.set('');

    try {
      // Save field mapping to connector config first
      const fieldMap: Record<string, string> = {};
      for (const m of this.fieldMappings) {
        if (m.appField) fieldMap[m.porichoyField] = m.appField;
      }
      const app = this.apiSyncApp();
      const existingConfig = app['connectorConfig'] ?? {};
      await this.api.patch(`/applications/${app['uuid']}`, {
        connectorConfig: { ...existingConfig, fieldMap },
      });

      // Build role mapping
      const roleMapping: Record<string, string> = {};
      for (const rm of this.roleMappings) {
        if (rm.appRole && rm.porichoyRole) roleMapping[rm.appRole] = rm.porichoyRole;
      }

      const result = await this.api.post(`/applications/${app['uuid']}/sync-from-api`, { roleMapping });
      this.apiSyncResult.set(result);
      this.apiSyncStep.set('results');
    } catch (e: any) {
      this.apiSyncError.set(e?.error?.error ?? 'Sync failed');
    } finally {
      this.apiSyncing.set(false);
    }
  }

  // --- Manual Sync ---

  async openSync(app: any) {
    this.syncApp.set(app);
    this.syncRows = [{ displayName: '', email: '', password: '', roleName: '' }];
    this.syncJson = '';
    this.syncCsv = '';
    this.syncMode.set('form');
    this.syncError.set('');
    this.syncResult.set(null);
    this.showSyncModal.set(true);

    try {
      const roles = await this.api.get<any[]>(`/applications/${app['uuid']}/roles`);
      this.syncRoles.set(roles);
    } catch { this.syncRoles.set([]); }
  }

  closeSyncModal() {
    this.showSyncModal.set(false);
    this.syncResult.set(null);
    this.syncError.set('');
  }

  addRow() {
    this.syncRows.push({ displayName: '', email: '', password: '', roleName: '' });
  }

  removeRow(idx: number) {
    this.syncRows.splice(idx, 1);
    if (this.syncRows.length === 0) this.addRow();
  }

  async executeSyncUsers() {
    this.syncing.set(true);
    this.syncError.set('');
    this.syncResult.set(null);

    try {
      let users: any[];

      if (this.syncMode() === 'form') {
        users = this.syncRows.filter(r => r.displayName && r.email).map(r => ({
          displayName: r.displayName,
          email: r.email,
          password: r.password || undefined,
          roleName: r.roleName || undefined,
        }));
      } else if (this.syncMode() === 'json') {
        try { users = JSON.parse(this.syncJson); } catch { this.syncError.set('Invalid JSON'); return; }
        if (!Array.isArray(users)) { this.syncError.set('JSON must be an array'); return; }
      } else {
        const lines = this.syncCsv.trim().split('\n').filter(l => l.trim());
        if (lines.length < 2) { this.syncError.set('CSV needs a header row and at least one data row'); return; }
        const headers = lines[0].split(',').map(h => h.trim());
        users = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((h, i) => { if (vals[i]) obj[h] = vals[i]; });
          return obj;
        });
      }

      if (!users.length) { this.syncError.set('No valid users to sync'); return; }

      const result = await this.api.post(`/applications/${this.syncApp()['uuid']}/sync-users`, { users });
      this.syncResult.set(result);
    } catch (e: any) {
      this.syncError.set(e?.error?.error ?? 'Sync failed');
    } finally {
      this.syncing.set(false);
    }
  }
}

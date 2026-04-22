import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthStore } from '../../../core/stores/auth.store';

const NAV = [
  { label: 'Dashboard',       path: '/admin',                icon: '▦' },
  { label: 'Identities',      path: '/admin/identities',     icon: '👤' },
  { label: 'Applications',    path: '/admin/applications',   icon: '⬡' },
  { label: 'Roles',           path: '/admin/roles',          icon: '🔑' },
  { label: 'Assignments',     path: '/admin/assignments',    icon: '↔' },
  { label: 'SoD Policies',    path: '/admin/sod-policies',   icon: '⚖' },
  { label: 'Access Reviews',  path: '/admin/reviews',        icon: '✓' },
  { label: 'Lifecycle',       path: '/admin/lifecycle',      icon: '⟳' },
  { label: 'Auth Policies',   path: '/admin/policies',       icon: '🛡' },
  { label: 'OAuth Clients',   path: '/admin/clients',        icon: '🔗' },
  { label: 'Audit Logs',      path: '/admin/audit',          icon: '📋' },
];

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  styles: [`
    .shell { display: flex; height: 100vh; overflow: hidden; }

    .sidebar {
      width: var(--sidebar-width);
      background: var(--sidebar-bg);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      overflow-y: auto;
    }

    .sidebar-brand {
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255,255,255,.08);
      .name { color: #fff; font-size: 16px; font-weight: 800; }
      .sub  { color: rgba(255,255,255,.4); font-size: 11px; }
    }

    .sidebar-nav { flex: 1; padding: .5rem 0; }

    .nav-item {
      display: flex;
      align-items: center;
      gap: .65rem;
      padding: .6rem 1rem;
      color: rgba(255,255,255,.6);
      font-size: 13px;
      text-decoration: none;
      transition: background .15s, color .15s;
      border-radius: 0;
      .icon { width: 20px; text-align: center; font-style: normal; }
      &:hover { background: rgba(255,255,255,.07); color: #fff; text-decoration: none; }
      &.active { background: rgba(99,102,241,.25); color: #a5b4fc; border-right: 2px solid var(--accent); }
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid rgba(255,255,255,.08);
      .user-name { color: rgba(255,255,255,.8); font-size: 13px; font-weight: 500; margin-bottom: .25rem; }
      .user-role { color: rgba(255,255,255,.4); font-size: 11px; margin-bottom: .75rem; }
    }

    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

    .topbar {
      height: 52px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 1.5rem;
      gap: 1rem;
      flex-shrink: 0;
    }

    .content { flex: 1; overflow-y: auto; padding: 1.5rem; }
  `],
  template: `
    <div class="shell">
      <aside class="sidebar">
        <div class="sidebar-brand">
          <div class="name">পরিচয় Porichoy</div>
          <div class="sub">IAM + IGA Platform</div>
        </div>

        <nav class="sidebar-nav">
          @for (item of nav; track item.path) {
            <a class="nav-item"
               [routerLink]="item.path"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{ exact: item.path === '/admin' }">
              <em class="icon">{{ item.icon }}</em>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="sidebar-footer">
          <div class="user-name">{{ store.user()?.displayName }}</div>
          <div class="user-role">{{ store.user()?.isAdmin ? 'Administrator' : 'User' }}</div>
          <button class="btn btn-ghost btn-sm btn-full" (click)="logout()">Sign out</button>
        </div>
      </aside>

      <div class="main">
        <header class="topbar">
          <span style="color:var(--text-muted);font-size:13px">{{ store.user()?.email ?? store.user()?.phone }}</span>
        </header>
        <main class="content">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  store = inject(AuthStore);
  private router = inject(Router);
  nav = NAV;

  async logout() {
    await this.store.logout();
    this.router.navigate(['/login']);
  }
}

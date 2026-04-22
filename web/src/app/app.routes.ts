import { Route } from '@angular/router';
import { authGuard, adminGuard, guestGuard } from './core/guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./features/admin/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'identities', loadComponent: () => import('./features/admin/identities/identities.component').then(m => m.IdentitiesComponent) },
      { path: 'applications', loadComponent: () => import('./features/admin/applications/applications.component').then(m => m.ApplicationsComponent) },
      { path: 'roles', loadComponent: () => import('./features/admin/roles/roles.component').then(m => m.RolesComponent) },
      { path: 'assignments', loadComponent: () => import('./features/admin/assignments/assignments.component').then(m => m.AssignmentsComponent) },
      { path: 'sod-policies', loadComponent: () => import('./features/admin/sod-policies/sod-policies.component').then(m => m.SodPoliciesComponent) },
      { path: 'reviews', loadComponent: () => import('./features/admin/reviews/reviews.component').then(m => m.ReviewsComponent) },
      { path: 'lifecycle', loadComponent: () => import('./features/admin/lifecycle/lifecycle.component').then(m => m.LifecycleComponent) },
      { path: 'policies', loadComponent: () => import('./features/admin/policies/policies.component').then(m => m.PoliciesComponent) },
      { path: 'clients', loadComponent: () => import('./features/admin/clients/clients.component').then(m => m.ClientsComponent) },
      { path: 'audit', loadComponent: () => import('./features/admin/audit/audit.component').then(m => m.AuditComponent) },
    ],
  },
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: '**', redirectTo: '/login' },
];

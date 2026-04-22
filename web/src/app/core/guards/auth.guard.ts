import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../stores/auth.store';

export const authGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.checked()) await store.loadMe();
  if (!store.user()) { router.navigate(['/login']); return false; }
  return true;
};

export const adminGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.checked()) await store.loadMe();
  if (!store.user()) { router.navigate(['/login']); return false; }
  if (!store.user()!.isAdmin) { router.navigate(['/login']); return false; }
  return true;
};

export const guestGuard: CanActivateFn = async () => {
  const store = inject(AuthStore);
  const router = inject(Router);

  if (!store.checked()) await store.loadMe();
  if (store.user()) {
    router.navigate([store.user()!.isAdmin ? '/admin' : '/login']);
    return false;
  }
  return true;
};

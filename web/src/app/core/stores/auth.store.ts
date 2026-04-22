import { inject } from '@angular/core';
import { signalStore, withState, withMethods, patchState } from '@ngrx/signals';
import { ApiService } from '../services/api.service';

export interface AuthUser {
  uuid: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  isAdmin: boolean;
  status: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  checked: boolean;
}

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>({ user: null, loading: false, checked: false }),
  withMethods((store, api = inject(ApiService)) => ({
    async loadMe() {
      patchState(store, { loading: true });
      try {
        const user = await api.get<AuthUser>('/auth/me');
        patchState(store, { user, checked: true });
      } catch {
        patchState(store, { user: null, checked: true });
      } finally {
        patchState(store, { loading: false });
      }
    },

    async login(body: { email?: string; phone?: string; password: string }) {
      const res = await api.post<{ identity: AuthUser }>('/auth/login', body);
      patchState(store, { user: res.identity, checked: true });
      return res.identity;
    },

    async loginOtp(body: { email?: string; phone?: string; otp: string }) {
      const res = await api.post<{ identity: AuthUser }>('/auth/otp/verify', body);
      patchState(store, { user: res.identity, checked: true });
      return res.identity;
    },

    async register(body: { displayName: string; email?: string; phone?: string; password?: string }) {
      return api.post<AuthUser>('/auth/register', body);
    },

    async requestOtp(body: { email?: string; phone?: string }) {
      return api.post<{ message: string; otp?: string }>('/auth/otp/request', body);
    },

    async logout() {
      try { await api.post('/auth/logout'); } catch { /* ignore */ }
      patchState(store, { user: null });
    },

    setUser(user: AuthUser | null) {
      patchState(store, { user, checked: true });
    },
  }))
);

import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

const BASE = 'http://localhost:3400';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get<T>(path: string) {
    return firstValueFrom(this.http.get<T>(`${BASE}${path}`, { withCredentials: true }));
  }

  post<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.post<T>(`${BASE}${path}`, body, { withCredentials: true }));
  }

  patch<T>(path: string, body: unknown = {}) {
    return firstValueFrom(this.http.patch<T>(`${BASE}${path}`, body, { withCredentials: true }));
  }

  delete<T = void>(path: string) {
    return firstValueFrom(this.http.delete<T>(`${BASE}${path}`, { withCredentials: true }));
  }
}

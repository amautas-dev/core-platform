import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Servicio base para llamadas a la API.
 * Expone la URL base y el cliente HTTP para uso en auth y otros servicios.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);

  get baseUrl(): string {
    return (environment as { apiUrl?: string }).apiUrl ?? '';
  }

  get<T>(path: string, params?: Record<string, string | number | boolean | null | undefined>) {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.get<T>(this.buildUrl(path), { params: httpParams });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(this.buildUrl(path), body);
  }

  put<T>(path: string, body: unknown, params?: Record<string, string | number | boolean | null | undefined>) {
    let httpParams = new HttpParams();
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null) continue;
        httpParams = httpParams.set(key, String(value));
      }
    }
    return this.http.put<T>(this.buildUrl(path), body, { params: httpParams });
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(this.buildUrl(path), body);
  }

  delete<T>(path: string) {
    return this.http.delete<T>(this.buildUrl(path));
  }

  buildUrl(path: string): string {
    const base = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  }
}

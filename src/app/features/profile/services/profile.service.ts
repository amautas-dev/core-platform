import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

const AUTH_BASE = 'platform/auth';

export interface ProfileMeDto {
  user: {
    id: string;
    email: string;
    username: string;
    name: string;
    role: string;
    lastLoginAt?: string;
  };
}

export interface SessionDto {
  id: string;
  ipAddress: string | null;
  deviceInfo: string | null;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly api = inject(ApiService);

  getMe(): Observable<ProfileMeDto> {
    return this.api.get<ProfileMeDto>(`${AUTH_BASE}/me`);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<void> {
    return this.api.post<void>(`${AUTH_BASE}/change-password`, {
      currentPassword,
      newPassword,
    });
  }

  getLoginHistory(): Observable<{ sessions: SessionDto[] }> {
    return this.api.get<{ sessions: SessionDto[] }>(`${AUTH_BASE}/me/sessions`);
  }
}

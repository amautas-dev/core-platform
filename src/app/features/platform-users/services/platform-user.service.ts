import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { PlatformUser } from '../models/platform-user.interface';
import { CreatePlatformUserDto } from '../models/create-platform-user.dto';
import { UpdatePlatformUserDto } from '../models/update-platform-user.dto';

/** Path relative to apiUrl (e.g. apiUrl = .../api → .../api/v1/platform/users) */
const BASE_PATH = 'v1/platform/users';

@Injectable({ providedIn: 'root' })
export class PlatformUserService {
  private readonly api = inject(ApiService);

  getUsers(): Observable<PlatformUser[]> {
    return this.api.get<PlatformUser[]>(BASE_PATH);
  }

  getUser(id: number): Observable<PlatformUser> {
    return this.api.get<PlatformUser>(`${BASE_PATH}/${id}`);
  }

  createUser(data: CreatePlatformUserDto): Observable<PlatformUser> {
    return this.api.post<PlatformUser>(BASE_PATH, data);
  }

  updateUser(id: number, data: UpdatePlatformUserDto): Observable<PlatformUser> {
    return this.api.put<PlatformUser>(`${BASE_PATH}/${id}`, data);
  }

  /**
   * Soft delete: PATCH :id/deactivate (sets is_active, deactivated_at, deactivated_by).
   * No usar DELETE cuando el esquema tiene is_active / soft delete.
   */
  deactivateUser(id: number): Observable<PlatformUser> {
    return this.api.patch<PlatformUser>(`${BASE_PATH}/${id}/deactivate`, {});
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { PlatformModule } from '../models/platform-module.interface';

const BASE_PATH = 'v1/platform/modules';

/** Payload for create/update module. */
export interface ModuleUpsertDto {
  code: string;
  name?: string | null;
  description?: string | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PlatformModulesService {
  private readonly api = inject(ApiService);

  getModules(): Observable<PlatformModule[]> {
    return this.api.get<PlatformModule[]>(BASE_PATH);
  }

  getModule(id: number): Observable<PlatformModule> {
    return this.api.get<PlatformModule>(`${BASE_PATH}/${id}`);
  }

  createModule(dto: ModuleUpsertDto): Observable<PlatformModule> {
    return this.api.post<PlatformModule>(BASE_PATH, dto);
  }

  updateModule(id: number, dto: Partial<ModuleUpsertDto>): Observable<PlatformModule> {
    return this.api.put<PlatformModule>(`${BASE_PATH}/${id}`, dto);
  }

  deleteModule(id: number): Observable<void> {
    return this.api.delete<void>(`${BASE_PATH}/${id}`);
  }

  enableModule(id: number): Observable<{ ok: boolean }> {
    return this.api.patch<{ ok: boolean }>(`${BASE_PATH}/${id}/enable`, {});
  }

  disableModule(id: number): Observable<{ ok: boolean }> {
    return this.api.patch<{ ok: boolean }>(`${BASE_PATH}/${id}/disable`, {});
  }
}

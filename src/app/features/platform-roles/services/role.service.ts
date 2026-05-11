import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { Role } from '../models/role.interface';
import { CreateRoleDto } from '../models/create-role.dto';
import { UpdateRoleDto } from '../models/update-role.dto';
import type { PlatformPermissionDto } from '../models/platform-permission.dto';

/** Path relative to apiUrl */
const BASE_PATH = 'v1/platform/roles';
const PERMISSIONS_PATH = 'v1/platform/permissions';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly api = inject(ApiService);

  getRoles(): Observable<Role[]> {
    return this.api.get<Role[]>(BASE_PATH);
  }

  getRole(id: number): Observable<Role> {
    return this.api.get<Role>(`${BASE_PATH}/${id}`);
  }

  createRole(data: CreateRoleDto): Observable<Role> {
    return this.api.post<Role>(BASE_PATH, data);
  }

  updateRole(id: number, data: UpdateRoleDto): Observable<Role> {
    return this.api.put<Role>(`${BASE_PATH}/${id}`, data);
  }

  /**
   * Lista de permisos disponibles desde el backend.
   * Respuesta: [{ module: "users", action: "read" }, ...]
   * Evita permisos hardcodeados; el selector se genera automáticamente.
   */
  getPlatformPermissions(): Observable<PlatformPermissionDto[]> {
    return this.api.get<PlatformPermissionDto[]>(PERMISSIONS_PATH);
  }

  getPermissions(): Observable<string[]> {
    return this.api.get<string[]>(`${BASE_PATH}/permissions`);
  }

  getRolePermissions(roleId: number): Observable<string[]> {
    return this.api.get<string[]>(`${BASE_PATH}/${roleId}/permissions`);
  }

  /**
   * PUT /roles/:id/permissions con payload { permissions: ["users.read", "users.create"] }.
   * Eso evita inconsistencias.
   */
  updateRolePermissions(roleId: number, permissions: string[]): Observable<Role> {
    return this.api.put<Role>(`${BASE_PATH}/${roleId}/permissions`, { permissions });
  }

  deactivateRole(id: number): Observable<Role> {
    return this.api.patch<Role>(`${BASE_PATH}/${id}/deactivate`, {});
  }
}

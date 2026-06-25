import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/api/api.service';

export interface ConsoleRoleListItem {
  consoleRoleId: string;
  code: string;
  name: string;
  description: string | null;
  sortOrder: number;
  featureCount: number;
  /** Incluido cuando la lista se pide con ?all=1 */
  productId?: string;
  productCode?: string | null;
  productName?: string | null;
}

export interface ConsoleRolesListResponse {
  scope?: 'all' | 'single';
  product?: { productId: string; productCode: string | null; productName: string | null };
  items: ConsoleRoleListItem[];
}

export interface ConsoleFeatureTreeNode {
  id: string;
  code: string;
  name: string;
  route: string | null;
  parentId: string | null;
  sortOrder: number;
  isMenu?: boolean | null;
  isRoute?: boolean | null;
  children: ConsoleFeatureTreeNode[];
}

/** Catálogo plano: solo features con lógica (ruta/API) — permisos a la izquierda. */
export interface PermissionCatalogEntry {
  featureId: string;
  code: string;
  name: string;
  route: string | null;
  moduleCode: string | null;
  sortOrder: number;
}

export interface MenuItemDto {
  menuItemId: string | null;
  featureId: string;
  titleOverride: string | null;
  sortOrder: number;
  showInSidebar: boolean | null;
}

export interface MenuGroupDto {
  menuGroupId: string | null;
  title: string;
  sortOrder: number;
  items: MenuItemDto[];
}

export interface ConsoleRoleEditorResponse {
  product: { productId: string; productCode: string | null; productName: string | null };
  role: { consoleRoleId: string; code: string; name: string };
  permissionFeatureIds: string[];
  menuGroups: MenuGroupDto[];
}

export interface ConsoleRolePermissionItem {
  permissionId: number;
  permissionCode: string;
  permissionName: string;
  description: string | null;
  assigned: boolean;
}

export interface ConsoleRolePermissionFeature {
  featureId: number;
  featureCode: string;
  featureName: string | null;
  moduleCode: string | null;
  moduleName: string | null;
  validPermissions: ConsoleRolePermissionItem[];
}

export interface ConsoleRolePermissionsResponse {
  role: {
    consoleRoleId: string;
    code: string;
    name: string;
    product: { productId: string; productCode: string | null; productName: string | null } | null;
  };
  source: 'console_role_permission';
  features: ConsoleRolePermissionFeature[];
}

export interface AssignableFeaturesResponse {
  product: { productId: string; productCode: string | null; productName: string | null };
  permissionCatalog: PermissionCatalogEntry[];
  featureTree: ConsoleFeatureTreeNode[];
}

export type PutConsoleRoleEditorBody = {
  permissionFeatureIds: string[];
  menu: {
    groups: Array<{
      title: string;
      items: Array<{
        featureId: string;
        titleOverride?: string | null;
        showInSidebar?: boolean | null;
      }>;
    }>;
  };
};

@Injectable({ providedIn: 'root' })
export class ConsoleRolesService {
  private readonly api = inject(ApiService);

  /** Listado de un solo producto (compatibilidad; por defecto CLUB). */
  list(productCode = 'CLUB') {
    return this.api.get<ConsoleRolesListResponse>('v1/platform/console-roles', { productCode });
  }

  /** Todos los roles de consola de todos los productos activos (columna producto por fila). */
  listAll() {
    return this.api.get<ConsoleRolesListResponse>('v1/platform/console-roles', { all: 1 });
  }

  listAssignableFeatures(productCode = 'CLUB') {
    return this.api.get<AssignableFeaturesResponse>('v1/platform/console-roles/assignable-features', {
      productCode,
    });
  }

  getRoleFeatures(consoleRoleId: string, productCode = 'CLUB') {
    return this.api.get<ConsoleRoleEditorResponse>(
      `v1/platform/console-roles/${consoleRoleId}/features`,
      { productCode },
    );
  }

  putRoleFeatures(consoleRoleId: string, body: PutConsoleRoleEditorBody, productCode = 'CLUB') {
    return this.api.put<ConsoleRoleEditorResponse & { ok: boolean }>(
      `v1/platform/console-roles/${consoleRoleId}/features`,
      body,
      { productCode },
    );
  }

  getRolePermissions(consoleRoleId: string) {
    return this.api.get<ConsoleRolePermissionsResponse>(
      `v1/platform/console-roles/${consoleRoleId}/permissions`,
    );
  }

  putRolePermissions(
    consoleRoleId: string,
    grants: Array<{ featureId: number; permissionId: number }>
  ) {
    return this.api.put<ConsoleRolePermissionsResponse & { ok: boolean }>(
      `v1/platform/console-roles/${consoleRoleId}/permissions`,
      { grants },
    );
  }
}

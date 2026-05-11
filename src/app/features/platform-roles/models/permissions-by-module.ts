import type { PlatformPermissionDto } from './platform-permission.dto';

export interface PermissionOption {
  readonly key: string;
  readonly value: string;
  readonly label: string;
}

export interface PermissionGroup {
  readonly moduleLabel: string;
  readonly permissions: readonly PermissionOption[];
}

/** Display order for permission groups (dashboard, tenants, plans, modules, users, roles, then any future). */
const MODULE_ORDER = [
  'dashboard',
  'tenants',
  'plans',
  'modules',
  'users',
  'roles',
] as const;

function moduleSortKey(moduleKey: string): number {
  const idx = MODULE_ORDER.indexOf(moduleKey as (typeof MODULE_ORDER)[number]);
  return idx >= 0 ? idx : MODULE_ORDER.length;
}

/**
 * Agrupa la respuesta del backend (GET /api/v1/platform/permissions) por módulo.
 * Respuesta esperada: [{ module: "users", action: "read" }, ...]
 * Orden: dashboard, tenants, plans, modules, users, roles, y el resto al final.
 */
export function groupPermissionsFromBackend(
  items: readonly PlatformPermissionDto[]
): PermissionGroup[] {
  const byModule = new Map<string, PermissionOption[]>();
  for (const { module: mod, action } of items) {
    const value = `${mod}.${action}`;
    const key = `${mod}_${action}`;
    const label = value;
    const option: PermissionOption = { key, value, label };
    const list = byModule.get(mod) ?? [];
    list.push(option);
    byModule.set(mod, list);
  }
  const moduleKeys = Array.from(byModule.keys()).sort(
    (a, b) => moduleSortKey(a) - moduleSortKey(b)
  );
  return moduleKeys.map((key) => ({
    moduleLabel: key.charAt(0).toUpperCase() + key.slice(1).toLowerCase(),
    permissions: byModule.get(key) ?? [],
  }));
}

/**
 * Expande permisos devueltos por GET /api/v1/platform/roles/:id/permissions
 * (p.ej. "tenants.*", "*") al conjunto de valores concretos del catálogo
 * para preseleccionar correctamente los checkboxes.
 */
export function expandRolePermissions(
  rolePermissions: readonly string[],
  allPermissionValues: readonly string[]
): Set<string> {
  const result = new Set<string>();
  for (const p of rolePermissions) {
    const trimmed = p?.trim();
    if (!trimmed) continue;
    if (trimmed === '*') {
      allPermissionValues.forEach((v) => result.add(v));
      continue;
    }
    if (trimmed.endsWith('.*')) {
      const modulePrefix = trimmed.slice(0, -2) + '.';
      allPermissionValues.forEach((v) => {
        if (v.startsWith(modulePrefix)) result.add(v);
      });
      continue;
    }
    result.add(trimmed);
  }
  return result;
}

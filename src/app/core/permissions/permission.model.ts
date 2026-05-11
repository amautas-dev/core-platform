/**
 * Permission identifier: "module.action" (e.g. users.read, users.create).
 * Used for route access and sidebar visibility.
 */
export interface Permission {
  readonly module: string;
  readonly action: string;
}

/** Format permission as "module.action". */
export function permissionString(permission: Permission): string {
  return `${permission.module}.${permission.action}`;
}

/** Parse "module.action" into Permission. */
export function parsePermission(value: string): Permission | null {
  const dot = value.indexOf('.');
  if (dot === -1) return null;
  return {
    module: value.slice(0, dot),
    action: value.slice(dot + 1),
  };
}

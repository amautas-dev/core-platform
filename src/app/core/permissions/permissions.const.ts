/**
 * Centralized permission strings. Use these instead of magic strings.
 * Evita strings mágicos y facilita refactorizar.
 */
export const PERMISSIONS = {
  USERS_READ: 'users.read',
  USERS_CREATE: 'users.create',
  USERS_UPDATE: 'users.update',
  USERS_DELETE: 'users.delete',

  TENANTS_READ: 'tenants.read',
  TENANTS_CREATE: 'tenants.create',
  TENANTS_UPDATE: 'tenants.update',
  TENANTS_DELETE: 'tenants.delete',

  ROLES_READ: 'roles.read',
  ROLES_CREATE: 'roles.create',
  ROLES_UPDATE: 'roles.update',
  ROLES_DELETE: 'roles.delete',

  PLANS_READ: 'plans.read',
  PLANS_CREATE: 'plans.create',
  PLANS_UPDATE: 'plans.update',
  PLANS_DELETE: 'plans.delete',

  MODULES_READ: 'modules.read',
  MODULES_CREATE: 'modules.create',
  MODULES_UPDATE: 'modules.update',
  MODULES_DELETE: 'modules.delete',

  PRODUCTS_READ: 'products.read',
  PRODUCTS_CREATE: 'products.create',
  PRODUCTS_UPDATE: 'products.update',
  PRODUCTS_DELETE: 'products.delete',

  FEATURES_READ: 'features.read',
  FEATURES_CREATE: 'features.create',
  FEATURES_UPDATE: 'features.update',
  FEATURES_DELETE: 'features.delete',

  DASHBOARD_READ: 'dashboard.read',
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

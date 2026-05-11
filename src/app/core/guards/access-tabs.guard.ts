import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PermissionService } from '../permissions/permission.service';
import { PERMISSIONS } from '../permissions/permissions.const';
import { PlatformRoutePathsService } from '../routing/platform-route-paths.service';

/** Lista de usuarios: exige `users.read` o redirige a roles si solo hay acceso a roles. */
export const usersSectionGuard: CanActivateFn = () => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const paths = inject(PlatformRoutePathsService);
  if (permissionService.hasPermission(PERMISSIONS.USERS_READ)) return true;
  if (permissionService.hasPermission(PERMISSIONS.ROLES_READ)) {
    return router.parseUrl(paths.usersRoles());
  }
  router.navigateByUrl(paths.dashboard());
  return false;
};

/** Lista de roles: exige `roles.read` o redirige a usuarios si solo hay acceso a usuarios. */
export const rolesSectionGuard: CanActivateFn = () => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const paths = inject(PlatformRoutePathsService);
  if (permissionService.hasPermission(PERMISSIONS.ROLES_READ)) return true;
  if (permissionService.hasPermission(PERMISSIONS.USERS_READ)) {
    return router.parseUrl(paths.users());
  }
  router.navigateByUrl(paths.dashboard());
  return false;
};

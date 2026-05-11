import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { PermissionService } from './permission.service';
import { PlatformRoutePathsService } from '../routing/platform-route-paths.service';

/**
 * Guard that reads route data.permission and redirects to the localized dashboard if the user lacks it.
 * If no permission is required (data.permission missing), access is allowed.
 */
export const permissionGuard: CanActivateFn = (route) => {
  const permissionService = inject(PermissionService);
  const router = inject(Router);
  const paths = inject(PlatformRoutePathsService);
  const requiredPermission = route.data['permission'] as string | undefined;

  if (!requiredPermission) {
    return true;
  }

  if (permissionService.hasPermission(requiredPermission)) {
    return true;
  }

  router.navigateByUrl(paths.dashboard());
  return false;
};

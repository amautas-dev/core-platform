import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/permissions/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';

export const PLATFORM_ROLES_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.ROLES_READ },
    loadComponent: () =>
      import('../pages/roles-list.page').then((m) => m.RolesListPage),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.ROLES_CREATE },
    loadComponent: () =>
      import('../pages/role-form.page').then((m) => m.RoleFormPage),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.ROLES_UPDATE },
    loadComponent: () =>
      import('../pages/role-form.page').then((m) => m.RoleFormPage),
  },
];

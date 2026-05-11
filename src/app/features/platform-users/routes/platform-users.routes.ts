import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/permissions/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';

export const PLATFORM_USERS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.USERS_READ },
    loadComponent: () =>
      import('../pages/users-list.page').then((m) => m.UsersListPage),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.USERS_CREATE },
    loadComponent: () =>
      import('../pages/user-form.page').then((m) => m.UserFormPage),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.USERS_UPDATE },
    loadComponent: () =>
      import('../pages/user-form.page').then((m) => m.UserFormPage),
  },
];

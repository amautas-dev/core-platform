import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/permissions/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';

export const PLATFORM_SERVICE_PLANS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.PLANS_READ },
    loadComponent: () =>
      import('../pages/service-plans-list.page').then((m) => m.ServicePlansListPage),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.PLANS_CREATE },
    loadComponent: () =>
      import('../pages/service-plan-form.page').then((m) => m.ServicePlanFormPage),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.PLANS_UPDATE },
    loadComponent: () =>
      import('../pages/service-plan-form.page').then((m) => m.ServicePlanFormPage),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.PLANS_READ },
    loadComponent: () =>
      import('../pages/service-plan-detail.page').then((m) => m.ServicePlanDetailPage),
  },
];

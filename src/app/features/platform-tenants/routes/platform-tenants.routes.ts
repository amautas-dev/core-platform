import { Routes } from '@angular/router';
import { permissionGuard } from '../../../core/permissions/permission.guard';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';

export const PLATFORM_TENANTS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.TENANTS_READ },
    loadComponent: () =>
      import('../pages/tenants-list.page').then((m) => m.TenantsListPage),
  },
  {
    path: 'create',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.TENANTS_CREATE },
    loadComponent: () =>
      import('../pages/tenant-onboarding-wizard.page').then((m) => m.TenantOnboardingWizardPage),
  },
  {
    path: ':id/edit',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.TENANTS_UPDATE },
    loadComponent: () =>
      import('../pages/tenant-detail.page').then((m) => m.TenantDetailPage),
  },
  {
    path: ':id/billing',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.TENANTS_READ },
    loadComponent: () =>
      import('../pages/tenant-billing.page').then((m) => m.TenantBillingPage),
  },
  {
    path: ':id',
    canActivate: [permissionGuard],
    data: { permission: PERMISSIONS.TENANTS_READ },
    loadComponent: () =>
      import('../pages/tenant-detail.page').then((m) => m.TenantDetailPage),
  },
];

import { Routes } from '@angular/router';
import { usersSectionGuard, rolesSectionGuard } from './core/guards/access-tabs.guard';
import { permissionGuard } from './core/permissions/permission.guard';
import { PERMISSIONS } from './core/permissions/permissions.const';
import { SEG } from './core/routing/route-segments';

const tenantChildren = (loc: 'es' | 'en'): Routes => {
  const c = SEG.create[loc];
  const e = SEG.edit[loc];
  const idEdit = loc === 'es' ? ':id/editar' : ':id/edit';
  const idBilling = loc === 'es' ? ':id/facturacion' : ':id/billing';
  return [
    {
      path: '',
      pathMatch: 'full',
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.TENANTS_READ },
      loadComponent: () =>
        import('./features/platform-tenants/pages/tenants-list.page').then((m) => m.TenantsListPage),
    },
    {
      path: c,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.TENANTS_CREATE },
      loadComponent: () =>
        import('./features/platform-tenants/pages/tenant-onboarding-wizard.page').then(
          (m) => m.TenantOnboardingWizardPage
        ),
    },
    {
      path: idEdit,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.TENANTS_UPDATE },
      loadComponent: () =>
        import('./features/platform-tenants/pages/tenant-detail.page').then((m) => m.TenantDetailPage),
    },
    {
      path: idBilling,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.TENANTS_READ },
      loadComponent: () =>
        import('./features/platform-tenants/pages/tenant-billing.page').then((m) => m.TenantBillingPage),
    },
    {
      path: ':id',
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.TENANTS_READ },
      loadComponent: () =>
        import('./features/platform-tenants/pages/tenant-detail.page').then((m) => m.TenantDetailPage),
    },
  ];
};

const catalogInner = (loc: 'es' | 'en'): Routes => {
  const P = SEG.products[loc];
  const SP = SEG.servicePlans[loc];
  const M = SEG.modules[loc];
  const F = SEG.features[loc];
  const CR = SEG.consoleRoles[loc];
  const c = SEG.create[loc];
  return [
    {
      path: '',
      pathMatch: 'full',
      loadComponent: () =>
        import('./features/platform-catalog/pages/catalog-redirect.page').then((m) => m.CatalogRedirectPage),
    },
    {
      path: P,
      loadComponent: () =>
        import('./features/platform-products/pages/platform-products-outlet.page').then(
          (m) => m.PlatformProductsOutletPage
        ),
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PRODUCTS_READ },
          loadComponent: () =>
            import('./features/platform-products/pages/products-list.page').then((m) => m.ProductsListPage),
        },
        {
          path: c,
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PRODUCTS_CREATE },
          loadComponent: () =>
            import('./features/platform-products/pages/product-form.page').then((m) => m.ProductFormPage),
        },
        {
          path: loc === 'es' ? ':id/editar' : ':id/edit',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PRODUCTS_UPDATE },
          loadComponent: () =>
            import('./features/platform-products/pages/product-form.page').then((m) => m.ProductFormPage),
        },
        {
          path: ':id',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PRODUCTS_READ },
          loadComponent: () =>
            import('./features/platform-products/pages/product-detail.page').then((m) => m.ProductDetailPage),
        },
      ],
    },
    {
      path: SP,
      loadComponent: () =>
        import('./features/platform-service-plans/pages/platform-service-plans-outlet.page').then(
          (m) => m.PlatformServicePlansOutletPage
        ),
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PLANS_READ },
          loadComponent: () =>
            import('./features/platform-service-plans/pages/service-plans-list.page').then(
              (m) => m.ServicePlansListPage
            ),
        },
        {
          path: c,
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PLANS_CREATE },
          loadComponent: () =>
            import('./features/platform-service-plans/pages/service-plan-form.page').then(
              (m) => m.ServicePlanFormPage
            ),
        },
        {
          path: loc === 'es' ? ':id/editar' : ':id/edit',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PLANS_UPDATE },
          loadComponent: () =>
            import('./features/platform-service-plans/pages/service-plan-form.page').then(
              (m) => m.ServicePlanFormPage
            ),
        },
        {
          path: ':id',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.PLANS_READ },
          loadComponent: () =>
            import('./features/platform-service-plans/pages/service-plan-detail.page').then(
              (m) => m.ServicePlanDetailPage
            ),
        },
      ],
    },
    {
      path: M,
      loadComponent: () =>
        import('./features/platform-modules/pages/platform-modules-outlet.page').then(
          (m) => m.PlatformModulesOutletPage
        ),
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.MODULES_READ },
          loadComponent: () =>
            import('./features/platform-modules/pages/modules-list.page').then((m) => m.ModulesListPage),
        },
        {
          path: c,
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.MODULES_CREATE },
          loadComponent: () =>
            import('./features/platform-modules/pages/module-form.page').then((m) => m.ModuleFormPage),
        },
        {
          path: ':id',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.MODULES_UPDATE },
          loadComponent: () =>
            import('./features/platform-modules/pages/module-form.page').then((m) => m.ModuleFormPage),
        },
      ],
    },
    {
      path: F,
      loadComponent: () =>
        import('./features/platform-features/pages/platform-features-outlet.page').then(
          (m) => m.PlatformFeaturesOutletPage
        ),
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.FEATURES_READ },
          loadComponent: () =>
            import('./features/platform-features/pages/features-list.page').then((m) => m.FeaturesListPage),
        },
        {
          path: c,
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.FEATURES_CREATE },
          loadComponent: () =>
            import('./features/platform-features/pages/feature-form.page').then((m) => m.FeatureFormPage),
        },
        {
          path: loc === 'es' ? ':id/editar' : ':id/edit',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.FEATURES_UPDATE },
          loadComponent: () =>
            import('./features/platform-features/pages/feature-form.page').then((m) => m.FeatureFormPage),
        },
      ],
    },
    {
      path: CR,
      loadComponent: () =>
        import('./features/platform-console-roles/pages/platform-console-roles-outlet.page').then(
          (m) => m.PlatformConsoleRolesOutletPage
        ),
      children: [
        {
          path: '',
          pathMatch: 'full',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.FEATURES_READ },
          loadComponent: () =>
            import('./features/platform-console-roles/pages/console-roles-list.page').then(
              (m) => m.ConsoleRolesListPage
            ),
        },
        {
          path: ':id',
          canActivate: [permissionGuard],
          data: { permission: PERMISSIONS.FEATURES_READ },
          loadComponent: () =>
            import('./features/platform-console-roles/pages/console-role-features.page').then(
              (m) => m.ConsoleRoleFeaturesPage
            ),
        },
      ],
    },
  ];
};

const usersChildren = (loc: 'es' | 'en'): Routes => {
  const r = SEG.roles[loc];
  const c = SEG.create[loc];
  return [
    {
      path: `${r}/${c}`,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.ROLES_CREATE },
      loadComponent: () =>
        import('./features/platform-roles/pages/role-form.page').then((m) => m.RoleFormPage),
    },
    {
      path: `${r}/:id`,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.ROLES_UPDATE },
      loadComponent: () =>
        import('./features/platform-roles/pages/role-form.page').then((m) => m.RoleFormPage),
    },
    {
      path: r,
      pathMatch: 'full',
      canActivate: [rolesSectionGuard, permissionGuard],
      data: { permission: PERMISSIONS.ROLES_READ },
      loadComponent: () =>
        import('./features/platform-roles/pages/roles-list.page').then((m) => m.RolesListPage),
    },
    {
      path: c,
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.USERS_CREATE },
      loadComponent: () =>
        import('./features/platform-users/pages/user-form.page').then((m) => m.UserFormPage),
    },
    {
      path: ':id',
      canActivate: [permissionGuard],
      data: { permission: PERMISSIONS.USERS_UPDATE },
      loadComponent: () =>
        import('./features/platform-users/pages/user-form.page').then((m) => m.UserFormPage),
    },
    {
      path: '',
      pathMatch: 'full',
      canActivate: [usersSectionGuard, permissionGuard],
      data: { permission: PERMISSIONS.USERS_READ },
      loadComponent: () =>
        import('./features/platform-users/pages/users-list.page').then((m) => m.UsersListPage),
    },
  ];
};

/** Rutas hijas del shell con variantes es/en en la barra de direcciones. */
export const shellChildren: Routes = [
  {
    path: SEG.dashboard.es,
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: SEG.dashboard.en,
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: SEG.tenants.es,
    loadComponent: () =>
      import('./features/platform-tenants/pages/platform-tenants-outlet.page').then(
        (m) => m.PlatformTenantsOutletPage
      ),
    children: tenantChildren('es'),
  },
  {
    path: SEG.tenants.en,
    loadComponent: () =>
      import('./features/platform-tenants/pages/platform-tenants-outlet.page').then(
        (m) => m.PlatformTenantsOutletPage
      ),
    children: tenantChildren('en'),
  },
  { path: 'productos', redirectTo: '/catalogo/productos', pathMatch: 'prefix' },
  { path: 'products', redirectTo: '/catalog/products', pathMatch: 'prefix' },
  { path: 'planes-de-servicio', redirectTo: '/catalogo/planes-de-servicio', pathMatch: 'prefix' },
  { path: 'service-plans', redirectTo: '/catalog/service-plans', pathMatch: 'prefix' },
  { path: 'modulos', redirectTo: '/catalogo/modulos', pathMatch: 'prefix' },
  { path: 'modules', redirectTo: '/catalog/modules', pathMatch: 'prefix' },
  { path: 'funcionalidades', redirectTo: '/catalogo/funcionalidades', pathMatch: 'prefix' },
  { path: 'features', redirectTo: '/catalog/features', pathMatch: 'prefix' },
  { path: 'roles-consola', redirectTo: '/catalogo/roles-consola', pathMatch: 'prefix' },
  { path: 'console-roles', redirectTo: '/catalog/console-roles', pathMatch: 'prefix' },
  {
    path: SEG.catalog.es,
    loadComponent: () =>
      import('./features/platform-catalog/pages/platform-catalog-shell.page').then(
        (m) => m.PlatformCatalogShellPage
      ),
    children: catalogInner('es'),
  },
  {
    path: SEG.catalog.en,
    loadComponent: () =>
      import('./features/platform-catalog/pages/platform-catalog-shell.page').then(
        (m) => m.PlatformCatalogShellPage
      ),
    children: catalogInner('en'),
  },
  {
    path: SEG.users.es,
    loadComponent: () =>
      import('./features/platform-access/pages/platform-access-shell.page').then(
        (m) => m.PlatformAccessShellPage
      ),
    children: usersChildren('es'),
  },
  {
    path: SEG.users.en,
    loadComponent: () =>
      import('./features/platform-access/pages/platform-access-shell.page').then(
        (m) => m.PlatformAccessShellPage
      ),
    children: usersChildren('en'),
  },
  { path: 'roles', pathMatch: 'full', redirectTo: '/users/roles' },
  { path: 'roles/create', pathMatch: 'full', redirectTo: '/users/roles/create' },
  { path: 'roles/:id', redirectTo: '/users/roles/:id' },
  {
    path: SEG.translations.es,
    loadComponent: () =>
      import('./features/platform-translations/pages/translations-list.page').then(
        (m) => m.TranslationsListPage
      ),
  },
  {
    path: SEG.translations.en,
    loadComponent: () =>
      import('./features/platform-translations/pages/translations-list.page').then(
        (m) => m.TranslationsListPage
      ),
  },
  {
    path: SEG.profile.es,
    loadComponent: () => import('./features/profile/pages/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: SEG.profile.en,
    loadComponent: () => import('./features/profile/pages/profile.page').then((m) => m.ProfilePage),
  },
  {
    path: SEG.settings.es,
    loadComponent: () =>
      import('./features/platform-settings/pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: SEG.settings.en,
    loadComponent: () =>
      import('./features/platform-settings/pages/settings.page').then((m) => m.SettingsPage),
  },
  {
    path: SEG.systemHealth.es,
    loadComponent: () =>
      import('./features/system-health/pages/system-health.page').then((m) => m.SystemHealthPage),
  },
  {
    path: SEG.systemHealth.en,
    loadComponent: () =>
      import('./features/system-health/pages/system-health.page').then((m) => m.SystemHealthPage),
  },
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/shell/home-redirect.page').then((m) => m.HomeRedirectPage),
  },
];

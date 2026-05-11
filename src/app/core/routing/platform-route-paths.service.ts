import { Injectable, inject } from '@angular/core';
import { LanguageService, type SupportedLang } from '../i18n/language.service';
import { SEG, pickSeg, type RouteLocale } from './route-segments';

/**
 * Rutas absolutas según el idioma actual (barra de direcciones localizada).
 */
@Injectable({ providedIn: 'root' })
export class PlatformRoutePathsService {
  private readonly language = inject(LanguageService);

  private L(): RouteLocale {
    return this.language.currentLang;
  }

  private j(...parts: string[]): string {
    return '/' + parts.filter(Boolean).join('/').replace(/\/+/g, '/');
  }

  dashboard(): string {
    return '/' + pickSeg(SEG.dashboard, this.L());
  }

  translations(): string {
    return '/' + pickSeg(SEG.translations, this.L());
  }

  settings(): string {
    return '/' + pickSeg(SEG.settings, this.L());
  }

  profile(): string {
    return '/' + pickSeg(SEG.profile, this.L());
  }

  systemHealth(): string {
    return '/' + pickSeg(SEG.systemHealth, this.L());
  }

  tenants(): string {
    return '/' + pickSeg(SEG.tenants, this.L());
  }

  tenantsCreate(): string {
    return this.j(pickSeg(SEG.tenants, this.L()), pickSeg(SEG.create, this.L()));
  }

  tenantDetail(id: string | number): string {
    return this.j(pickSeg(SEG.tenants, this.L()), String(id));
  }

  tenantEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.tenants, this.L()),
      String(id),
      pickSeg(SEG.edit, this.L())
    );
  }

  /** Plan y add-ons (monetización) — `/tenants/:id/billing` · `/empresas/:id/facturacion`. */
  tenantBilling(id: string | number): string {
    return this.j(pickSeg(SEG.tenants, this.L()), String(id), pickSeg(SEG.billing, this.L()));
  }

  catalogRoot(): string {
    return '/' + pickSeg(SEG.catalog, this.L());
  }

  catalogProducts(): string {
    return this.j(pickSeg(SEG.catalog, this.L()), pickSeg(SEG.products, this.L()));
  }

  catalogProductsCreate(): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.products, this.L()),
      pickSeg(SEG.create, this.L())
    );
  }

  catalogProductDetail(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.products, this.L()),
      String(id)
    );
  }

  catalogProductEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.products, this.L()),
      String(id),
      pickSeg(SEG.edit, this.L())
    );
  }

  catalogServicePlans(): string {
    return this.j(pickSeg(SEG.catalog, this.L()), pickSeg(SEG.servicePlans, this.L()));
  }

  catalogServicePlansCreate(): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.servicePlans, this.L()),
      pickSeg(SEG.create, this.L())
    );
  }

  catalogServicePlanDetail(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.servicePlans, this.L()),
      String(id)
    );
  }

  catalogServicePlanEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.servicePlans, this.L()),
      String(id),
      pickSeg(SEG.edit, this.L())
    );
  }

  catalogModules(): string {
    return this.j(pickSeg(SEG.catalog, this.L()), pickSeg(SEG.modules, this.L()));
  }

  catalogModulesCreate(): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.modules, this.L()),
      pickSeg(SEG.create, this.L())
    );
  }

  catalogModuleEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.modules, this.L()),
      String(id)
    );
  }

  catalogFeatures(): string {
    return this.j(pickSeg(SEG.catalog, this.L()), pickSeg(SEG.features, this.L()));
  }

  catalogFeaturesCreate(): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.features, this.L()),
      pickSeg(SEG.create, this.L())
    );
  }

  catalogFeatureEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.features, this.L()),
      String(id),
      pickSeg(SEG.edit, this.L())
    );
  }

  /** Roles de consola (p. ej. club_admin) y matriz con features — catálogo platform. */
  catalogConsoleRoles(): string {
    return this.j(pickSeg(SEG.catalog, this.L()), pickSeg(SEG.consoleRoles, this.L()));
  }

  /** Edición de features y menú lateral para un rol de consola del catálogo (por id numérico). */
  catalogConsoleRoleFeatures(consoleRoleId: string | number): string {
    return this.j(
      pickSeg(SEG.catalog, this.L()),
      pickSeg(SEG.consoleRoles, this.L()),
      String(consoleRoleId)
    );
  }

  users(): string {
    return '/' + pickSeg(SEG.users, this.L());
  }

  usersCreate(): string {
    return this.j(pickSeg(SEG.users, this.L()), pickSeg(SEG.create, this.L()));
  }

  userEdit(id: string | number): string {
    return this.j(pickSeg(SEG.users, this.L()), String(id));
  }

  usersRoles(): string {
    return this.j(pickSeg(SEG.users, this.L()), pickSeg(SEG.roles, this.L()));
  }

  usersRolesCreate(): string {
    return this.j(
      pickSeg(SEG.users, this.L()),
      pickSeg(SEG.roles, this.L()),
      pickSeg(SEG.create, this.L())
    );
  }

  userRoleEdit(id: string | number): string {
    return this.j(
      pickSeg(SEG.users, this.L()),
      pickSeg(SEG.roles, this.L()),
      String(id)
    );
  }

  /** Segmento de catálogo para `catalog-redirect` (products | service-plans | …). */
  catalogSegmentKey(
    key: 'products' | 'service-plans' | 'modules' | 'features' | 'console-roles',
    lang: SupportedLang = this.language.currentLang
  ): string {
    const map = {
      products: SEG.products,
      'service-plans': SEG.servicePlans,
      modules: SEG.modules,
      features: SEG.features,
      'console-roles': SEG.consoleRoles,
    } as const;
    return pickSeg(map[key], lang);
  }
}

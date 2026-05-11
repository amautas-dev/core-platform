import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin, of, switchMap, map, finalize } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TenantService } from '../services/tenant.service';
import { ServicePlanService } from '../../platform-service-plans/services/service-plan.service';
import { ProductsService } from '../../platform-products/services/products.service';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import type { TenantDetail, TenantServiceSubscriptionLine } from '../models/tenant-detail.interface';
import type { ServicePlan } from '../models/service-plan.interface';
import type { ServicePlanModule } from '../../platform-service-plans/models/service-plan-module.interface';
import type { ServicePlanLimit } from '../../platform-service-plans/models/service-plan-limit.interface';
import type { ProductAddonRow } from '../../platform-products/models/product-addon.interface';
import type { TenantStandaloneFeature } from '../models/tenant-feature.interface';

const PLAN_ORDER = ['STARTER', 'GROWTH', 'PRO', 'FULL'];

export type AddonCapabilityUi = 'enabled' | 'available' | 'locked';

@Component({
  selector: 'app-tenant-billing-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
    TranslateModule,
  ],
  templateUrl: './tenant-billing.page.html',
  styleUrls: ['./tenant-billing.page.scss'],
})
export class TenantBillingPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly tenantService = inject(TenantService);
  private readonly servicePlanService = inject(ServicePlanService);
  private readonly productsService = inject(ProductsService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly tenant = signal<TenantDetail | null>(null);
  readonly tenantId = signal<number | null>(null);
  /** Línea de producto CLUB (o primera suscripción abierta). */
  readonly clubLine = signal<TenantServiceSubscriptionLine | null>(null);
  readonly countryCode = signal<string>('AR');

  readonly plans = signal<ServicePlan[]>([]);
  readonly modulesByPlanId = signal<Record<number, ServicePlanModule[]>>({});
  readonly currentPlanModules = signal<ServicePlanModule[]>([]);
  readonly currentPlanLimits = signal<ServicePlanLimit[]>([]);
  readonly currentPlanId = signal<number | null>(null);

  readonly addons = signal<ProductAddonRow[]>([]);
  readonly standaloneByCode = signal<Map<string, TenantStandaloneFeature>>(new Map());

  /** Fila de add-on en la que se está persistiendo el flag (deshabilita el botón). */
  readonly addonActivatingProductAddonId = signal<number | null>(null);

  readonly sortedPlans = computed(() => {
    const list = [...this.plans()];
    list.sort((a, b) => {
      const ia = PLAN_ORDER.indexOf((a.planCode ?? '').toUpperCase());
      const ib = PLAN_ORDER.indexOf((b.planCode ?? '').toUpperCase());
      const sa = ia === -1 ? 99 : ia;
      const sb = ib === -1 ? 99 : ib;
      return sa - sb;
    });
    return list;
  });

  ngOnInit(): void {
    const raw = this.route.snapshot.paramMap.get('id');
    const id = raw ? parseInt(raw, 10) : NaN;
    if (Number.isNaN(id)) {
      this.error.set(this.translate.instant('tenants.billingInvalidTenant'));
      this.loading.set(false);
      return;
    }
    this.tenantId.set(id);
    this.load(id);
  }

  private load(tenantId: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.tenantService
      .getTenantDetail(tenantId)
      .pipe(
        switchMap((tenant) => {
          const cc = (tenant.countryCode ?? 'AR').trim().toUpperCase().slice(0, 2) || 'AR';
          const subs = tenant.serviceSubscriptions ?? [];
          const club =
            subs.find((s) => (s.productCode ?? '').toUpperCase() === 'CLUB') ?? subs[0] ?? null;
          const productId = club?.productId ?? null;
          const planId = club?.servicePlanId ?? null;

          if (productId == null) {
            this.error.set(this.translate.instant('tenants.billingNoProduct'));
            return of({
              tenant,
              club,
              cc,
              plans: [] as ServicePlan[],
              modulesByPlanId: {} as Record<number, ServicePlanModule[]>,
              currentModules: [] as ServicePlanModule[],
              limits: [] as ServicePlanLimit[],
              standalone: [] as TenantStandaloneFeature[],
              addons: [] as ProductAddonRow[],
            });
          }

          return forkJoin({
            tenant: of(tenant),
            club: of(club),
            cc: of(cc),
            plans: this.tenantService.getServicePlans({
              country: cc,
              productId,
              tenantId,
              includeInactive: true,
            }),
            standalone: this.tenantService.getTenantStandaloneFeatures(tenantId),
            addons: this.productsService.getProductAddons(productId, cc),
            currentModules:
              planId != null
                ? this.servicePlanService.getPlanModules(planId, cc)
                : of([] as ServicePlanModule[]),
            limits:
              planId != null
                ? this.servicePlanService.getPlanLimits(planId)
                : of([] as ServicePlanLimit[]),
          }).pipe(
            switchMap((base) => {
              const ids = base.plans.map((p) => p.servicePlanId);
              if (ids.length === 0) {
                return of({ ...base, modulesByPlanId: {} as Record<number, ServicePlanModule[]> });
              }
              return forkJoin(
                ids.map((sid) =>
                  this.servicePlanService.getPlanModules(sid, base.cc).pipe(
                    map((mods) => ({ sid, mods } as const)),
                  ),
                ),
              ).pipe(
                map((rows) => {
                  const modulesByPlanId: Record<number, ServicePlanModule[]> = {};
                  for (const { sid, mods } of rows) {
                    modulesByPlanId[sid] = mods;
                  }
                  return { ...base, modulesByPlanId };
                }),
              );
            }),
          );
        }),
      )
      .subscribe({
        next: (data) => {
          this.tenant.set(data.tenant);
          this.clubLine.set(data.club);
          this.countryCode.set(data.cc);
          this.plans.set(data.plans);
          this.modulesByPlanId.set(data.modulesByPlanId);
          this.currentPlanId.set(data.club?.servicePlanId ?? null);
          this.currentPlanModules.set(data.currentModules);
          this.currentPlanLimits.set(data.limits);
          const map = new Map<string, TenantStandaloneFeature>();
          for (const f of data.standalone) {
            map.set(f.featureCode, f);
          }
          this.standaloneByCode.set(map);
          this.addons.set(
            [...data.addons].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
          );
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(
            err?.error?.error ?? err?.message ?? this.translate.instant('tenants.billingLoadError'),
          );
          this.loading.set(false);
        },
      });
  }

  isCurrentPlan(plan: ServicePlan): boolean {
    const cur = this.currentPlanId();
    return cur != null && plan.servicePlanId === cur;
  }

  planModules(plan: ServicePlan): ServicePlanModule[] {
    const rows = this.modulesByPlanId()[plan.servicePlanId] ?? [];
    return rows.filter((m) => m.enabled);
  }

  formatMoney(plan: ServicePlan): string {
    const n = plan.price;
    if (n == null || Number.isNaN(Number(n))) return '—';
    const cur = plan.currency ?? '';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: cur || 'ARS',
        maximumFractionDigits: 0,
      }).format(Number(n));
    } catch {
      return `${n} ${cur}`.trim();
    }
  }

  /** Texto opcional del plan (la API puede enviar `description`; el tipo lookup no siempre lo incluye en el checker). */
  billingPlanDescription(plan: ServicePlan): string | null {
    const d = (plan as ServicePlan & { description?: string | null }).description;
    if (d == null || typeof d !== 'string') return null;
    const t = d.trim();
    return t.length > 0 ? t : null;
  }

  limitLabel(code: string): string {
    const k = `tenants.usageMetric.${code}`;
    const t = this.translate.instant(k);
    return t !== k ? t : code;
  }

  addonState(row: ProductAddonRow): AddonCapabilityUi {
    const code = row.featureCode ?? '';
    const s = this.standaloneByCode().get(code);
    if (s?.enabled) {
      return 'enabled';
    }
    if (row.isActive && row.isSellable) {
      return 'available';
    }
    return 'locked';
  }

  addonDescription(row: ProductAddonRow): string | null {
    const s = this.standaloneByCode().get(row.featureCode ?? '');
    return s?.description ?? null;
  }

  upgradePlan(_plan: ServicePlan): void {
    this.snackBar.open(this.translate.instant('tenants.billingUpgradeSoon'), this.translate.instant('common.close'), {
      duration: 4000,
    });
  }

  enableAddon(row: ProductAddonRow): void {
    const tid = this.tenantId();
    const code = row.featureCode;
    if (tid == null || !code) return;
    this.addonActivatingProductAddonId.set(row.productAddonId);
    this.tenantService
      .updateTenantFeatures(tid, [
        { featureCode: code, enabled: true, entitlementSource: 'ADDON_FEATURE' },
      ])
      .pipe(
        switchMap(() => this.tenantService.getTenantStandaloneFeatures(tid)),
        finalize(() => this.addonActivatingProductAddonId.set(null)),
      )
      .subscribe({
        next: (list) => {
          const map = new Map<string, TenantStandaloneFeature>();
          for (const f of list) {
            map.set(f.featureCode, f);
          }
          this.standaloneByCode.set(map);
          this.snackBar.open(
            this.translate.instant('tenants.billingAddonActivated', { name: row.featureName ?? code }),
            this.translate.instant('common.ok'),
            { duration: 3500 },
          );
        },
        error: (err) => {
          const apiErr = err?.error?.error;
          let msgKey = 'tenants.billingAddonActivateError';
          if (apiErr === 'feature_not_in_addon_catalog') {
            msgKey = 'tenants.billingAddonErrNotInCatalog';
          } else if (apiErr === 'no_product_subscription') {
            msgKey = 'tenants.billingAddonErrNoProduct';
          }
          this.snackBar.open(this.translate.instant(msgKey), this.translate.instant('common.close'), {
            duration: 5000,
          });
        },
      });
  }
}

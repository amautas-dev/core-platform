import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute, Params } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { forkJoin } from 'rxjs';
import { ServicePlanService } from '../services/service-plan.service';
import { PlatformFeaturesService } from '../../platform-features/services/platform-features.service';
import type { PlatformFeature } from '../../platform-features/models/platform-feature.interface';
import { CreateServicePlanDto } from '../models/create-service-plan.dto';
import { UpdateServicePlanDto } from '../models/update-service-plan.dto';
import { ServicePlanLimit } from '../models/service-plan-limit.interface';
import { ServicePlanModule } from '../models/service-plan-module.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { PricingService } from '../../../core/pricing/pricing.service';
import { defaultCurrencyForCountry } from '../../../core/market/active-market.service';

/** Billing interval options for the form (API may not persist yet). */
export const BILLING_INTERVALS = [
  { value: 'monthly', labelKey: 'servicePlans.billingIntervalMonthly' },
  { value: 'yearly', labelKey: 'servicePlans.billingIntervalYearly' },
] as const;

/** Mercados habituales para el selector de pricing (se añade siempre el país actual de la URL). */
const DEFAULT_PRICING_COUNTRY_CODES = ['AR', 'CO', 'ES', 'MX', 'US'] as const;

@Component({
  selector: 'app-service-plan-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatTableModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './service-plan-form.page.html',
  styleUrls: ['./service-plan-form.page.scss'],
})
export class ServicePlanFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly servicePlanService = inject(ServicePlanService);
  private readonly platformFeaturesService = inject(PlatformFeaturesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly translate = inject(TranslateService);
  private readonly pricing = inject(PricingService);
  private readonly destroyRef = inject(DestroyRef);
  readonly paths = inject(PlatformRoutePathsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly planId = signal<number | null>(null);
  /** Mercado del precio editado (query `country`); default AR */
  readonly priceCountry = signal<string>('AR');
  /** Filtro de producto de la lista (query `productId`); 0 = todos */
  readonly filterProductId = signal<number>(0);

  readonly planLimits = signal<ServicePlanLimit[]>([]);
  readonly editableLimits = signal<{ limitCode: string; limitValue: number }[]>([]);
  readonly planModules = signal<ServicePlanModule[]>([]);
  /** Catálogo de features para costo sugerido (suma de priceMonthly por módulos habilitados). */
  readonly catalogFeatures = signal<PlatformFeature[]>([]);

  /** Add-ons marcados “incluir en propuesta” (solo referencia en pantalla; no persiste en API). */
  readonly addonProposalInclude = signal<Record<number, boolean>>({});

  /** Features con taxonomía ADDON del catálogo cargado (orden alfabético por nombre). */
  readonly catalogAddonFeatures = computed(() => {
    const list = this.catalogFeatures().filter((f) => this.pricing.isAddonFeature(f));
    return [...list].sort((a, b) =>
      String(a.name || a.code || '').localeCompare(String(b.name || b.code || ''), undefined, {
        sensitivity: 'base',
      }),
    );
  });

  /** Suma mensual de add-ons incluidos en la propuesta (mercado actual). */
  readonly addonsInProposalTotal = computed(() => {
    const sel = this.addonProposalInclude();
    const addons = this.catalogAddonFeatures();
    const cc = this.priceCountry();
    let sum = 0;
    for (const f of addons) {
      if (sel[f.featureId]) {
        sum += this.pricing.getEffectiveFeatureMonthly(f, cc);
      }
    }
    return sum;
  });

  /** Precio sugerido core + add-ons marcados (referencia comercial). */
  readonly proposalWithAddonsTotal = computed(
    () => this.planSuggestedPriceWithMargin() + this.addonsInProposalTotal(),
  );

  /**
   * Expansiones de cupo de socios en catálogo (p. ej. club.quota.members.plus500).
   * Precio vía {@link effectiveFeatureMonthly} (mercado del plan).
   */
  readonly quotaExpansionFeatures = computed(() => {
    const re = /\.quota\.members\.plus(\d+)$/i;
    const list = this.catalogFeatures().filter((f) => f.code && re.test(String(f.code)));
    const mapped = list.map((f) => {
      const m = String(f.code).match(re);
      const plusMembers = m ? parseInt(m[1], 10) : 0;
      return { feature: f, plusMembers };
    });
    return mapped.sort((a, b) => a.plusMembers - b.plusMembers);
  });

  /**
   * Desglose por módulo habilitado: nombre, costo base, % del total.
   * Ordenado por impacto (costo base descendente).
   */
  readonly planModuleBreakdownRows = computed(() => {
    const rows = this.pricing.getPlanModuleBaseCosts(
      this.planModules(),
      this.catalogFeatures(),
      this.priceCountry(),
    );
    const mods = this.planModules();
    const mapped = rows.map((r) => {
      const m = mods.find(
        (x) => x.enabled && String(x.moduleCode ?? '').trim() === r.moduleCode,
      );
      const displayName =
        (m?.moduleName != null && String(m.moduleName).trim() !== ''
          ? String(m.moduleName).trim()
          : null) ?? m?.moduleCode ?? r.moduleCode;
      return { moduleCode: r.moduleCode, displayName, baseCost: r.baseCost };
    });
    const total = mapped.reduce((s, r) => s + r.baseCost, 0);
    const withPct = mapped.map((r) => ({
      ...r,
      percentOfTotal: total > 0 ? Math.round((r.baseCost / total) * 100) : 0,
    }));
    return [...withPct].sort((a, b) => b.baseCost - a.baseCost);
  });

  readonly limitsLoading = signal(false);
  readonly limitsSaving = signal(false);
  readonly modulesLoading = signal(false);
  readonly modulesSaving = signal(false);

  readonly limitsTableColumns = ['limitCode', 'limitValue', 'actions'];

  readonly billingIntervals = BILLING_INTERVALS;

  /** Opciones del selector de país para costo base / sugerido (catálogo + país activo). */
  pricingCountrySelectOptions(): string[] {
    const cur = this.priceCountry();
    const set = new Set<string>([...DEFAULT_PRICING_COUNTRY_CODES, cur]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }

  readonly form = this.fb.nonNullable.group({
    planCode: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
    planName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(4000)]],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', [Validators.required, Validators.minLength(1), Validators.maxLength(10)]],
    billingInterval: ['monthly' as const],
  });

  readonly PERMISSIONS = PERMISSIONS;

  ngOnInit(): void {
    const prod = this.route.snapshot.queryParamMap.get('productId');
    if (prod) {
      const n = parseInt(prod, 10);
      if (!isNaN(n) && n > 0) {
        this.filterProductId.set(n);
      }
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.planId.set(numId);
        this.isEdit.set(true);
      }
    }

    let firstCountryEmit = true;
    this.route.queryParamMap
      .pipe(
        map((qm) => {
          const raw = qm.get('country');
          return raw && raw.trim() !== '' ? raw.trim().toUpperCase().slice(0, 2) : 'AR';
        }),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cc) => {
        const prev = this.priceCountry();
        this.priceCountry.set(cc);
        const planId = this.planId();
        if (planId !== null && this.isEdit() && !firstCountryEmit && cc !== prev) {
          this.loadPlan(planId);
        }
        firstCountryEmit = false;
      });

    if (this.planId() !== null && this.isEdit()) {
      this.loadPlan(this.planId()!);
    }
  }

  private loadPlan(id: number): void {
    this.loading.set(true);
    const cc = this.priceCountry();
    this.servicePlanService.getPlan(id, cc).subscribe({
      next: (plan) => {
        this.form.patchValue({
          planCode: plan.planCode,
          planName: plan.planName,
          description: plan.description ?? '',
          price: plan.price,
          currency: plan.currency ?? 'USD',
          billingInterval: 'monthly',
        });
        this.loading.set(false);
        this.loadLimitsAndModules(id);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar plan');
        this.loading.set(false);
      },
    });
  }

  private loadLimitsAndModules(planId: number): void {
    const cc = this.priceCountry();
    this.limitsLoading.set(true);
    this.modulesLoading.set(true);
    forkJoin({
      limits: this.servicePlanService.getPlanLimits(planId),
      modules: this.servicePlanService.getPlanModules(planId, cc),
      features: this.platformFeaturesService.getFeatures(),
    }).subscribe({
      next: ({ limits, modules, features }) => {
        this.planLimits.set(limits);
        this.editableLimits.set(limits.map((l) => ({ limitCode: l.limitCode, limitValue: l.limitValue })));
        this.planModules.set(modules);
        this.catalogFeatures.set(features);
        this.limitsLoading.set(false);
        this.modulesLoading.set(false);
      },
      error: () => {
        this.limitsLoading.set(false);
        this.modulesLoading.set(false);
      },
    });
  }

  effectiveFeatureMonthly(feature: PlatformFeature): number {
    return this.pricing.getEffectiveFeatureMonthly(feature, this.priceCountry());
  }

  /** Valor numérico del límite en la tabla editable (misma fila que se guarda abajo). */
  limitValueForCode(code: string): number | null {
    const r = this.editableLimits().find((x) => String(x.limitCode).trim() === code);
    if (!r || String(r.limitCode).trim() === '') return null;
    const v = Number(r.limitValue);
    return Number.isFinite(v) ? v : null;
  }

  onAddonProposalChange(featureId: number, checked: boolean): void {
    this.addonProposalInclude.update((m) => ({ ...m, [featureId]: checked }));
  }

  planBaseCostFromFeatures(): number {
    return this.pricing.getPlanBaseCostFromFeatures(
      this.planModules(),
      this.catalogFeatures(),
      this.priceCountry(),
    );
  }

  planSuggestedPriceWithMargin(): number {
    return this.pricing.getPlanSuggestedPrice(
      this.planModules(),
      this.catalogFeatures(),
      this.pricing.defaultMargin,
      this.priceCountry(),
    );
  }

  /** Cambia el mercado de referencia para pricing y recarga el plan regional (precio/divisa del API). */
  onPricingCountrySelect(code: string): void {
    const normalized =
      code && String(code).trim() !== '' ? String(code).trim().toUpperCase().slice(0, 2) : 'AR';
    if (normalized === this.priceCountry()) {
      return;
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        country: normalized,
        ...(this.filterProductId() > 0 ? { productId: this.filterProductId() } : {}),
      },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  planDeviationPercent(): number | null {
    const suggested = this.planSuggestedPriceWithMargin();
    const current = Number(this.form.get('price')?.value ?? 0);
    return this.pricing.getDeviation(current, suggested);
  }

  /** Mensaje principal del análisis (ngx-translate con parámetros). */
  planPricingAnalysisMessage(): string {
    const suggested = this.planSuggestedPriceWithMargin();
    if (suggested <= 0) {
      return this.translate.instant('servicePlans.pricingNoBaseHint');
    }
    const d = this.planDeviationPercent();
    const cls = this.pricing.classifyDeviation(d);
    if (cls === 'low_margin' && d != null) {
      return this.translate.instant('servicePlans.planBelowRecommendedPct', { pct: Math.abs(d).toFixed(1) });
    }
    if (cls === 'overpriced' && d != null) {
      return this.translate.instant('servicePlans.planOvervalued', { pct: d.toFixed(1) });
    }
    if (cls === 'ok') {
      return this.translate.instant('servicePlans.planOptimalRange');
    }
    return '';
  }

  planPricingWarnings(): { low: boolean; high: boolean } {
    const d = this.planDeviationPercent();
    const cls = this.pricing.classifyDeviation(d);
    return { low: cls === 'low_margin', high: cls === 'overpriced' };
  }

  /** Moneda del formulario para el pipe `currency` en el desglose. */
  pricingDisplayCurrency(): string {
    const c = this.form.get('currency')?.value;
    return c != null && String(c).trim() !== '' ? String(c).trim() : 'USD';
  }

  /** Moneda habitual del mercado activo (referencia; el plan guarda la moneda de la API). */
  typicalCurrencyForMarket(): string {
    return defaultCurrencyForCountry(this.priceCountry());
  }

  applySuggestedPriceToForm(): void {
    const s = this.planSuggestedPriceWithMargin();
    if (!Number.isFinite(s) || s <= 0) return;
    const rounded = Math.round(s * 100) / 100;
    this.form.patchValue({ price: rounded });
  }

  updateEditableLimit(index: number, field: 'limitCode' | 'limitValue', value: string | number): void {
    const numValue = field === 'limitValue' ? Number(value) : value;
    this.editableLimits.update((arr) => {
      const next = [...arr];
      next[index] = { ...next[index], [field]: numValue };
      return next;
    });
  }

  addLimitRow(): void {
    this.editableLimits.update((arr) => [...arr, { limitCode: '', limitValue: 0 }]);
  }

  removeLimitRow(index: number): void {
    this.editableLimits.update((arr) => arr.filter((_, i) => i !== index));
  }

  onModuleToggle(mod: ServicePlanModule, enabled: boolean): void {
    const id = this.planId();
    if (id === null) return;
    const payload = this.planModules().map((m) => ({
      moduleId: m.moduleId,
      enabled: m.moduleId === mod.moduleId ? enabled : m.enabled,
    }));
    this.modulesSaving.set(true);
    this.error.set(null);
    const cc = this.priceCountry();
    this.servicePlanService.updatePlanModules(id, payload, cc).subscribe({
      next: (list) => {
        this.planModules.set(list);
        this.modulesSaving.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al actualizar módulos');
        this.modulesSaving.set(false);
      },
    });
  }

  saveLimits(): void {
    const id = this.planId();
    if (id === null) return;
    const toSave = this.editableLimits().filter((r) => String(r.limitCode).trim() !== '');
    this.limitsSaving.set(true);
    this.error.set(null);
    this.servicePlanService
      .updatePlanLimits(
        id,
        toSave.map((r) => ({ limitCode: String(r.limitCode).trim(), limitValue: r.limitValue }))
      )
      .subscribe({
        next: () => {
          this.servicePlanService.getPlanLimits(id).subscribe({
            next: (list) => {
              this.planLimits.set(list);
              this.editableLimits.set(list.map((l) => ({ limitCode: l.limitCode, limitValue: l.limitValue })));
            },
          });
          this.limitsSaving.set(false);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al guardar límites');
          this.limitsSaving.set(false);
        },
      });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const id = this.planId();
    const raw = this.form.getRawValue();

    if (id !== null) {
      const data: UpdateServicePlanDto = {
        planCode: raw.planCode,
        planName: raw.planName,
        description: raw.description?.trim() ? raw.description.trim() : '',
        price: raw.price,
        currency: raw.currency,
      };
      this.servicePlanService.updatePlan(id, data, this.priceCountry()).subscribe({
        next: () => {
          this.loading.set(false);
          this.navigateBackToList();
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al actualizar plan');
          this.loading.set(false);
        },
      });
    } else {
      const data: CreateServicePlanDto = {
        planCode: raw.planCode,
        planName: raw.planName,
        description: raw.description?.trim() ? raw.description.trim() : undefined,
        price: raw.price,
        currency: raw.currency,
      };
      this.servicePlanService.createPlan(data).subscribe({
        next: () => {
          this.loading.set(false);
          this.navigateBackToList();
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al crear plan');
          this.loading.set(false);
        },
      });
    }
  }

  private navigateBackToList(): void {
    void this.router.navigate([this.paths.catalogServicePlans()], {
      queryParams: this.listQueryParams(),
    });
  }

  listQueryParams(): Params {
    const cc = this.priceCountry();
    const pid = this.filterProductId();
    const q: Params = { country: cc };
    if (pid > 0) {
      q['productId'] = pid;
    }
    return q;
  }

  planModulesMarketHintText(): string {
    return this.translate.instant('servicePlans.planModulesMarketHint', { country: this.priceCountry() });
  }

  regionalBasicFieldsHintText(): string {
    return this.translate.instant('servicePlans.regionalBasicFieldsHint', { country: this.priceCountry() });
  }
}

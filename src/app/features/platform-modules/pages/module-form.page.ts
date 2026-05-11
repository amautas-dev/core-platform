import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { forkJoin } from 'rxjs';
import { PlatformModulesService } from '../services/platform-modules.service';
import { PlatformFeaturesService } from '../../platform-features/services/platform-features.service';
import type { PlatformFeature } from '../../platform-features/models/platform-feature.interface';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PricingService } from '../../../core/pricing/pricing.service';
import { ActiveMarketService } from '../../../core/market/active-market.service';

/** Mercados para el selector de precio de referencia (mismo criterio que planes). */
const MODULE_PRICING_COUNTRIES = ['AR', 'CO', 'ES', 'MX', 'US'] as const;

@Component({
  selector: 'app-module-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './module-form.page.html',
  styleUrls: ['./module-form.page.scss'],
})
export class ModuleFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  readonly paths = inject(PlatformRoutePathsService);
  readonly market = inject(ActiveMarketService);
  private readonly modulesService = inject(PlatformModulesService);
  private readonly featuresService = inject(PlatformFeaturesService);
  private readonly permission = inject(PermissionService);
  private readonly pricing = inject(PricingService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  /** Carga inicial del módulo + catálogo de features (solo edición). */
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly moduleId = signal<number | null>(null);

  /** Código del módulo cargado (enlace con feature.moduleCode). */
  readonly moduleCodeRef = signal<string>('');
  readonly features = signal<PlatformFeature[]>([]);

  /** Mercado para precios efectivos (overrides por país); query `country`. */
  readonly priceCountry = signal<string>('AR');

  /** Features cuyo moduleCode coincide con el módulo en edición. */
  readonly featuresInThisModule = computed((): PlatformFeature[] => {
    const mc = this.moduleCodeRef();
    if (!mc) return [];
    return this.features().filter((f) => f.moduleCode === mc);
  });

  /** Suma de precios mensuales efectivos (solo features del módulo). */
  readonly sumFeatureMonthlyInModule = computed(() =>
    this.pricing.getFeatureTotal(this.featuresInThisModule(), this.priceCountry()),
  );

  /** Precio sugerido (costo base × margen del catálogo). */
  readonly moduleSuggestedPrice = computed(() =>
    this.pricing.getModuleSuggestedPrice(
      this.featuresInThisModule(),
      this.pricing.defaultMargin,
      this.priceCountry(),
    ),
  );

  readonly featuresError = signal<string | null>(null);
  readonly assigningFeatureIds = signal<Set<number>>(new Set());

  readonly featureColumns: string[] = ['code', 'name', 'priceMonthly', 'otherModule', 'inModule'];

  canUpdateFeatures(): boolean {
    return this.permission.hasPermission(PERMISSIONS.FEATURES_UPDATE);
  }

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
    name: ['', [Validators.maxLength(100)]],
    description: ['', [Validators.maxLength(255)]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.route.queryParamMap
      .pipe(
        map((qm) => {
          const raw = qm.get('country');
          return raw && raw.trim() !== '' ? raw.trim().toUpperCase().slice(0, 2) : 'AR';
        }),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((cc) => this.priceCountry.set(cc));

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.moduleId.set(numId);
        this.isEdit.set(true);
        this.loadModule(numId);
      }
    }
  }

  modulePricingCountryOptions(): string[] {
    const cur = this.priceCountry();
    return Array.from(new Set<string>([...MODULE_PRICING_COUNTRIES, cur])).sort((a, b) => a.localeCompare(b));
  }

  onModulePricingCountrySelect(code: string): void {
    const normalized =
      code && String(code).trim() !== '' ? String(code).trim().toUpperCase().slice(0, 2) : 'AR';
    if (normalized === this.priceCountry()) return;
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country: normalized },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  /** Precio mensual de referencia para la fila (override regional o base). */
  effectiveMonthlyForFeature(f: PlatformFeature): number {
    return this.pricing.getEffectiveFeatureMonthly(f, this.priceCountry());
  }

  private loadModule(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.featuresError.set(null);
    forkJoin({
      mod: this.modulesService.getModule(id),
      feats: this.featuresService.getFeatures(),
    }).subscribe({
      next: ({ mod, feats }) => {
        this.moduleCodeRef.set(mod.code?.trim() ?? '');
        this.form.patchValue({
          code: mod.code ?? '',
          name: mod.name ?? '',
          description: mod.description ?? '',
          isActive: mod.isActive,
        });
        this.features.set(this.sortFeatures(feats));
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar módulo');
        this.loading.set(false);
      },
    });
  }

  private sortFeatures(list: PlatformFeature[]): PlatformFeature[] {
    return [...list].sort((a, b) => {
      const so = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      if (so !== 0) return so;
      return String(a.code ?? '').localeCompare(String(b.code ?? ''));
    });
  }

  isFeatureInThisModule(f: PlatformFeature): boolean {
    const mc = this.moduleCodeRef();
    return mc !== '' && f.moduleCode === mc;
  }

  /** Si la feature está asignada a otro módulo, devuelve su código para mostrarlo. */
  otherModuleCode(f: PlatformFeature): string | null {
    const mc = this.moduleCodeRef();
    if (!f.moduleCode || f.moduleCode === mc) return null;
    return f.moduleCode;
  }

  onFeatureModuleToggle(f: PlatformFeature, checked: boolean): void {
    const code = this.moduleCodeRef();
    if (!code || !this.canUpdateFeatures()) return;
    this.featuresError.set(null);
    this.assigningFeatureIds.update((s) => new Set(s).add(f.featureId));
    this.featuresService
      .updateFeature(f.featureId, { moduleCode: checked ? code : null })
      .subscribe({
        next: (updated) => {
          this.features.update((list) =>
            this.sortFeatures(list.map((row) => (row.featureId === updated.featureId ? updated : row))),
          );
          this.assigningFeatureIds.update((s) => {
            const n = new Set(s);
            n.delete(f.featureId);
            return n;
          });
        },
        error: (err) => {
          this.featuresError.set(err?.error?.error ?? err?.message ?? 'Error al actualizar feature');
          this.assigningFeatureIds.update((s) => {
            const n = new Set(s);
            n.delete(f.featureId);
            return n;
          });
        },
      });
  }

  isAssigningFeature(id: number): boolean {
    return this.assigningFeatureIds().has(id);
  }

  submit(): void {
    if (this.form.invalid || this.saving() || this.loading()) return;
    const id = this.moduleId();
    const value = this.form.getRawValue();
    const dto = {
      code: value.code.trim(),
      name: value.name?.trim() || null,
      description: value.description?.trim() || null,
      isActive: value.isActive,
    };
    this.saving.set(true);
    this.error.set(null);
    if (id != null) {
      this.modulesService.updateModule(id, dto).subscribe({
        next: () => void this.router.navigate([this.paths.catalogModules()]),
        error: (err) => {
          this.error.set(err?.error?.error ?? err?.message ?? 'Error al guardar');
          this.saving.set(false);
        },
      });
    } else {
      this.modulesService.createModule(dto).subscribe({
        next: () => void this.router.navigate([this.paths.catalogModules()]),
        error: (err) => {
          this.error.set(err?.error?.error ?? err?.message ?? 'Error al crear');
          this.saving.set(false);
        },
      });
    }
  }
}

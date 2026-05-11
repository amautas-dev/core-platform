import { Component, DestroyRef, inject, signal, OnInit, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormArray,
  FormGroup,
  AbstractControl,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { PlatformFeaturesService, type FeatureUpsertDto } from '../services/platform-features.service';
import { PlatformModule } from '../../platform-modules/models/platform-module.interface';
import { PlatformFeature } from '../models/platform-feature.interface';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ActiveMarketService } from '../../../core/market/active-market.service';

type TriBool = 'unset' | 'yes' | 'no';

function triToApi(v: TriBool): boolean | null {
  if (v === 'unset') return null;
  return v === 'yes';
}

function apiToTri(v: boolean | null | undefined): TriBool {
  if (v === null || v === undefined) return 'unset';
  return v ? 'yes' : 'no';
}

@Component({
  selector: 'app-feature-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatSlideToggleModule,
    MatIconModule,
    MatExpansionModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './feature-form.page.html',
  styleUrls: ['./feature-form.page.scss'],
})
export class FeatureFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly featuresService = inject(PlatformFeaturesService);
  readonly paths = inject(PlatformRoutePathsService);
  readonly market = inject(ActiveMarketService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly i18n = inject(I18nService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly featureId = signal<number | null>(null);
  readonly modules = signal<PlatformModule[]>([]);
  readonly allFeatures = signal<PlatformFeature[]>([]);

  readonly parentOptions = computed(() => {
    const id = this.featureId();
    const list = this.allFeatures();
    if (id == null) return list;
    return list.filter((f) => f.featureId !== id);
  });

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(80)]],
    name: ['', [Validators.maxLength(120)]],
    description: ['', [Validators.maxLength(255)]],
    featureType: [''],
    moduleCode: [''],
    route: ['', [Validators.maxLength(255)]],
    icon: ['', [Validators.maxLength(80)]],
    parentFeatureId: [''],
    sortOrder: [0, [Validators.min(0)]],
    isMenu: ['unset' as TriBool],
    isRoute: ['unset' as TriBool],
    showInSidebar: [true],
    priceMonthly: [null as number | null],
    priceSetup: [null as number | null],
    overrides: this.fb.array<FormGroup>([]),
  });

  get overridesArray(): FormArray {
    return this.form.get('overrides') as FormArray;
  }

  ngOnInit(): void {
    this.form
      .get('featureType')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((ft) => this.applyFeatureTypeRules(String(ft ?? '')));

    this.featuresService.getModules().subscribe({
      next: (list) => this.modules.set(list),
    });
    this.featuresService.getFeatures().subscribe({
      next: (list) => this.allFeatures.set(list),
    });
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.featureId.set(numId);
        this.isEdit.set(true);
        this.loadFeature(numId);
      }
    }
  }

  private loadFeature(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.featuresService.getFeature(id).subscribe({
      next: (f) => {
        this.form.patchValue({
          code: f.code ?? '',
          name: f.name ?? '',
          description: f.description ?? '',
          featureType: f.featureType ?? '',
          moduleCode: f.moduleCode ?? '',
          route: f.route ?? '',
          icon: f.icon ?? '',
          parentFeatureId: f.parentFeatureId != null ? String(f.parentFeatureId) : '',
          sortOrder: f.sortOrder ?? 0,
          isMenu: apiToTri(f.isMenu),
          isRoute: apiToTri(f.isRoute),
          showInSidebar: f.showInSidebar !== false,
          priceMonthly: f.priceMonthly ?? null,
          priceSetup: f.priceSetup ?? null,
        });
        this.applyFeatureTypeRules(f.featureType ?? '');
        this.patchOverridesFromFeature(f);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error loading feature');
        this.loading.set(false);
      },
    });
  }

  private createOverrideGroup(data?: {
    countryCode?: string;
    priceMonthly?: number | null;
    priceSetup?: number | null;
    currencyCode?: string | null;
  }): FormGroup {
    return this.fb.group({
      countryCode: [data?.countryCode ?? ''],
      priceMonthly: [data?.priceMonthly ?? null],
      priceSetup: [data?.priceSetup ?? null],
      currencyCode: [data?.currencyCode ?? ''],
    });
  }

  private patchOverridesFromFeature(f: PlatformFeature): void {
    while (this.overridesArray.length) {
      this.overridesArray.removeAt(0);
    }
    const o = f.overrides;
    if (!o || typeof o !== 'object') return;
    const entries = Object.keys(o).sort();
    for (const countryCode of entries) {
      const row = o[countryCode];
      if (!row) continue;
      this.overridesArray.push(
        this.createOverrideGroup({
          countryCode,
          priceMonthly: row.priceMonthly ?? null,
          priceSetup: row.priceSetup ?? null,
          currencyCode: row.currencyCode ?? '',
        }),
      );
    }
  }

  addMarket(): void {
    this.overridesArray.push(this.createOverrideGroup());
  }

  removeMarket(index: number): void {
    this.overridesArray.removeAt(index);
  }

  /** Código ISO de la fila de override (para etiquetas «Precio AR», etc.). */
  overrideRowCountryCode(ctrl: AbstractControl): string {
    const v = (ctrl as FormGroup).get('countryCode')?.value;
    const s = String(v ?? '')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    return /^[A-Z]{2}$/.test(s) ? s : '—';
  }

  /** Taxonomía ADDON: precio independiente; no entra en sumas por módulo/plan core. */
  isAddonTaxonomySelected(): boolean {
    return String(this.form.get('featureType')?.value ?? '').trim().toUpperCase() === 'ADDON';
  }

  /** Badge cuando el mercado tiene al menos precio/divisa explícitos en el override. */
  showOverrideBadge(ctrl: AbstractControl): boolean {
    const v = ctrl.value as {
      countryCode?: string;
      priceMonthly?: unknown;
      priceSetup?: unknown;
      currencyCode?: string;
    };
    const cc = String(v.countryCode ?? '').trim();
    if (cc.length !== 2) return false;
    const pm = v.priceMonthly;
    const ps = v.priceSetup;
    const hasPm = pm !== null && pm !== '' && Number.isFinite(Number(pm));
    const hasPs = ps !== null && ps !== '' && Number.isFinite(Number(ps));
    const hasCur = String(v.currencyCode ?? '').trim() !== '';
    return hasPm || hasPs || hasCur;
  }

  effectiveMonthly(ctrl: AbstractControl): number | null {
    const v = ctrl.value as { priceMonthly?: unknown };
    const ov = v.priceMonthly;
    if (ov !== null && ov !== '' && Number.isFinite(Number(ov))) return Number(ov);
    const base = this.form.get('priceMonthly')?.value;
    if (base != null && Number.isFinite(Number(base))) return Number(base);
    return null;
  }

  effectiveSetup(ctrl: AbstractControl): number | null {
    const v = ctrl.value as { priceSetup?: unknown };
    const ov = v.priceSetup;
    if (ov !== null && ov !== '' && Number.isFinite(Number(ov))) return Number(ov);
    const base = this.form.get('priceSetup')?.value;
    if (base != null && Number.isFinite(Number(base))) return Number(base);
    return null;
  }

  showUsesBaseHint(ctrl: AbstractControl): boolean {
    const v = ctrl.value as { countryCode?: string };
    const cc = String(v.countryCode ?? '').trim();
    return cc.length === 2 && !this.showOverrideBadge(ctrl);
  }

  private validateOverridesDuplicate(): boolean {
    const codes = this.overridesArray.controls
      .map((c) => String((c as FormGroup).getRawValue().countryCode ?? '').trim().toUpperCase())
      .filter((c) => c.length === 2);
    return new Set(codes).size !== codes.length;
  }

  private buildOverridesForApi(): NonNullable<FeatureUpsertDto['overrides']> {
    const parseOptMoney = (v: unknown): number | null => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    return this.overridesArray.controls.map((c) => {
      const r = (c as FormGroup).getRawValue() as {
        countryCode: string;
        priceMonthly: unknown;
        priceSetup: unknown;
        currencyCode: string;
      };
      return {
        countryCode: String(r.countryCode ?? '').trim().toUpperCase(),
        priceMonthly: parseOptMoney(r.priceMonthly),
        priceSetup: parseOptMoney(r.priceSetup),
        currencyCode: String(r.currencyCode ?? '').trim().toUpperCase() || null,
      };
    }).filter((r) => r.countryCode.length === 2);
  }

  private applyFeatureTypeRules(featureTypeRaw: string): void {
    const mc = this.form.get('moduleCode');
    if (!mc) return;
    const ft = String(featureTypeRaw ?? '').trim().toUpperCase();
    if (ft === 'ADDON') {
      mc.setValue('', { emitEvent: false });
      mc.disable({ emitEvent: false });
    } else {
      mc.enable({ emitEvent: false });
    }
    if (ft === 'CORE') {
      mc.setValidators([Validators.required]);
    } else {
      mc.setValidators([]);
    }
    mc.updateValueAndValidity({ emitEvent: false });
  }

  submit(): void {
    if (this.form.invalid || this.loading()) return;
    const id = this.featureId();
    const value = this.form.getRawValue();
    const parentRaw = String(value.parentFeatureId ?? '').trim();
    const parsedParent = parentRaw === '' ? null : Number(parentRaw);
    const parentFeatureId = parsedParent != null && Number.isFinite(parsedParent) ? parsedParent : null;
    const isMenu = triToApi(value.isMenu as TriBool);
    const isRoute = triToApi(value.isRoute as TriBool);

    const ftRaw = String(value.featureType ?? '').trim();
    const featureType = ftRaw === '' ? null : ftRaw.toUpperCase();

    const parseOptMoney = (v: unknown): number | null => {
      if (v === '' || v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };

    if (this.validateOverridesDuplicate()) {
      this.error.set(this.i18n.translate('features.duplicateCountry'));
      return;
    }
    const overridesPayload = this.buildOverridesForApi();

    const base = {
      code: value.code.trim(),
      name: value.name?.trim() || null,
      description: value.description?.trim() || null,
      featureType,
      moduleCode: value.moduleCode?.trim() || null,
      route: value.route?.trim() || null,
      icon: value.icon?.trim() || null,
      parentFeatureId,
      sortOrder: Number(value.sortOrder) || 0,
      showInSidebar: value.showInSidebar,
      priceMonthly: parseOptMoney(value.priceMonthly),
      priceSetup: parseOptMoney(value.priceSetup),
    };

    this.loading.set(true);
    this.error.set(null);
    if (id != null) {
      this.featuresService
        .updateFeature(id, { ...base, isMenu, isRoute, overrides: overridesPayload })
        .subscribe({
          next: () => void this.router.navigate([this.paths.catalogFeatures()]),
          error: (err) => {
            this.error.set(err?.error?.error ?? err?.message ?? 'Error saving');
            this.loading.set(false);
          },
        });
    } else {
      const createDto: FeatureUpsertDto = {
        code: base.code,
        name: base.name,
        description: base.description,
        featureType: base.featureType,
        moduleCode: base.moduleCode,
        route: base.route,
        icon: base.icon,
        parentFeatureId: base.parentFeatureId,
        sortOrder: base.sortOrder,
        showInSidebar: base.showInSidebar,
        priceMonthly: base.priceMonthly,
        priceSetup: base.priceSetup,
        overrides: overridesPayload,
      };
      if (isMenu !== null) createDto.isMenu = isMenu;
      if (isRoute !== null) createDto.isRoute = isRoute;
      this.featuresService.createFeature(createDto).subscribe({
        next: () => void this.router.navigate([this.paths.catalogFeatures()]),
        error: (err) => {
          this.error.set(err?.error?.error ?? err?.message ?? 'Error creating');
          this.loading.set(false);
        },
      });
    }
  }
}

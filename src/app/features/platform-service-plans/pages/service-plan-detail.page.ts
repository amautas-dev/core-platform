import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Params } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ServicePlanService } from '../services/service-plan.service';
import { ServicePlan } from '../models/service-plan.interface';
import { ServicePlanLimit } from '../models/service-plan-limit.interface';
import { ServicePlanModule } from '../models/service-plan-module.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-service-plan-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatTableModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatSlideToggleModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './service-plan-detail.page.html',
  styleUrls: ['./service-plan-detail.page.scss'],
})
export class ServicePlanDetailPage implements OnInit {
  private readonly servicePlanService = inject(ServicePlanService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly translate = inject(TranslateService);
  readonly paths = inject(PlatformRoutePathsService);

  readonly plan = signal<ServicePlan | null>(null);
  readonly planLimits = signal<ServicePlanLimit[]>([]);
  readonly editableLimits = signal<{ limitCode: string; limitValue: number }[]>([]);
  readonly planModules = signal<ServicePlanModule[]>([]);
  /** Mercado del catálogo (query `country`); precio y módulos regionales. */
  readonly catalogCountry = signal<string>('AR');
  readonly filterProductId = signal<number>(0);
  readonly loading = signal(false);
  readonly limitsLoading = signal(false);
  readonly limitsSaving = signal(false);
  readonly modulesLoading = signal(false);
  readonly modulesSaving = signal(false);
  readonly error = signal<string | null>(null);

  readonly planId = computed(() => this.plan()?.servicePlanId ?? null);
  /** Id de ruta (disponible antes de cargar el plan; evita enlaces `.../null/edit`). */
  readonly routePlanId = signal<number | null>(null);
  readonly PERMISSIONS = PERMISSIONS;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const prod = q.get('productId');
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
        this.routePlanId.set(numId);
      }
    }

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
        this.catalogCountry.set(cc);
        const rid = this.routePlanId();
        if (rid != null) {
          this.loadPlan(rid);
          this.loadPlanModules(rid);
        }
      });

    const rid = this.routePlanId();
    if (rid != null) {
      this.loadLimits(rid);
    }
  }

  /** Coherente con la lista / edición (precio y módulos por mercado). */
  listQueryParams(): Params {
    const cc = this.catalogCountry();
    const pid = this.filterProductId();
    const q: Params = { country: cc };
    if (pid > 0) {
      q['productId'] = pid;
    }
    return q;
  }

  catalogCountryContextText(): string {
    return this.translate.instant('servicePlans.catalogCountryContext', { country: this.catalogCountry() });
  }

  planModulesMarketHintText(): string {
    return this.translate.instant('servicePlans.planModulesMarketHint', { country: this.catalogCountry() });
  }

  private loadPlan(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    const cc = this.catalogCountry();
    this.servicePlanService.getPlan(id, cc).subscribe({
      next: (p) => {
        this.plan.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar plan');
        this.loading.set(false);
      },
    });
  }

  private loadLimits(planId: number): void {
    this.limitsLoading.set(true);
    this.servicePlanService.getPlanLimits(planId).subscribe({
      next: (list) => {
        this.planLimits.set(list);
        this.editableLimits.set(list.map((l) => ({ limitCode: l.limitCode, limitValue: l.limitValue })));
        this.limitsLoading.set(false);
      },
      error: () => this.limitsLoading.set(false),
    });
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

  private loadPlanModules(planId: number): void {
    this.modulesLoading.set(true);
    const cc = this.catalogCountry();
    this.servicePlanService.getPlanModules(planId, cc).subscribe({
      next: (list) => {
        this.planModules.set(list);
        this.modulesLoading.set(false);
      },
      error: () => this.modulesLoading.set(false),
    });
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
    const cc = this.catalogCountry();
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
    const toSave = this.editableLimits().filter((r) => r.limitCode.trim() !== '');
    this.limitsSaving.set(true);
    this.error.set(null);
    this.servicePlanService
      .updatePlanLimits(
        id,
        toSave.map((r) => ({ limitCode: r.limitCode.trim(), limitValue: r.limitValue }))
      )
      .subscribe({
        next: () => {
          this.loadLimits(id);
          this.limitsSaving.set(false);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al guardar límites');
          this.limitsSaving.set(false);
        },
      });
  }
}

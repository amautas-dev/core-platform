import { Component, inject, signal, OnInit, ViewChild, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { map, distinctUntilChanged } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { PlatformFeaturesService } from '../services/platform-features.service';
import { PlatformFeature } from '../models/platform-feature.interface';
import { MessageBoxService } from 'ui-kit';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslateService } from '@ngx-translate/core';
import { PricingService } from '../../../core/pricing/pricing.service';
import { CountriesService } from '../../platform-products/services/countries.service';
import type { CountryMarket } from '../../platform-products/models/country-market.interface';

@Component({
  selector: 'app-features-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './features-list.page.html',
  styleUrls: ['./features-list.page.scss'],
})
export class FeaturesListPage implements OnInit {
  private readonly featuresService = inject(PlatformFeaturesService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly i18n = inject(I18nService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);
  readonly pricing = inject(PricingService);
  private readonly countriesService = inject(CountriesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** Mercado para columna de precio efectivo y badges (ISO2). */
  readonly viewCountry = signal<string>('AR');
  readonly countries = signal<CountryMarket[]>([]);

  /** Incluye el mercado activo aunque no venga aún en la lista de países. */
  countriesForSelect(): CountryMarket[] {
    const list = this.countries();
    const cur = this.viewCountry();
    if (list.length === 0) {
      return [{ countryCode: cur, name: cur, defaultCurrency: '', sortOrder: 0 }];
    }
    if (list.some((c) => c.countryCode === cur)) return list;
    return [{ countryCode: cur, name: cur, defaultCurrency: '', sortOrder: 0 }, ...list];
  }

  readonly dataSource = new MatTableDataSource<PlatformFeature>([]);
  readonly pageSize = 15;
  readonly pageSizeOptions: number[] = [15, 30, 50];

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  readonly PERMISSIONS = PERMISSIONS;
  readonly displayedColumns = [
    'sortOrder',
    'code',
    'name',
    'priceBase',
    'priceMarket',
    'featureType',
    'moduleCode',
    'showInSidebar',
    'actions',
  ];

  /** Etiqueta traducida para la columna de taxonomía. */
  featureTypeLabel(row: PlatformFeature): string {
    const t = row.featureType;
    if (!t) {
      return '—';
    }
    return this.translate.instant(`features.taxonomy.${t}`);
  }

  effectiveMonthly(row: PlatformFeature): number {
    return this.pricing.getEffectiveFeatureMonthly(row, this.viewCountry());
  }

  monthlySource(row: PlatformFeature): 'override' | 'base' {
    return this.pricing.getMonthlyPriceSource(row, this.viewCountry());
  }

  formatBaseMonthly(row: PlatformFeature): string {
    if (row.priceMonthly == null) return '—';
    const n = Number(row.priceMonthly);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  formatMarketMonthly(row: PlatformFeature): string {
    const n = this.effectiveMonthly(row);
    if (!Number.isFinite(n)) return '—';
    const src = this.monthlySource(row);
    const baseMissing = row.priceMonthly == null || !Number.isFinite(Number(row.priceMonthly));
    if (src === 'base' && baseMissing && n === 0) return '—';
    return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  onViewCountryChange(code: string): void {
    const normalized = String(code || 'AR')
      .trim()
      .toUpperCase()
      .slice(0, 2);
    this.viewCountry.set(normalized);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country: normalized },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

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
      .subscribe((cc) => this.viewCountry.set(cc));

    this.countriesService.list().subscribe({
      next: (list) => this.countries.set(list),
      error: () => this.countries.set([]),
    });
    this.loadFeatures();
  }

  loadFeatures(): void {
    this.loading.set(true);
    this.error.set(null);
    this.featuresService.getFeatures().subscribe({
      next: (list) => {
        this.dataSource.data = list;
        this.dataSource.paginator?.firstPage();
        this.loading.set(false);
      },
      error: (err) => {
        const body = err?.error;
        const hint = body?.hint;
        const code = body?.error;
        this.error.set(
          hint ? `${code ?? err?.message ?? 'Error'}: ${hint}` : (err?.message ?? 'Error loading features'),
        );
        this.loading.set(false);
      },
    });
  }

  async deleteFeature(feature: PlatformFeature): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>${this.i18n.translate('features.deleteConfirm')}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.error.set(null);
    this.featuresService.deleteFeature(feature.featureId).subscribe({
      next: () => this.loadFeatures(),
      error: (err) => this.error.set(err?.error?.error ?? err?.message ?? 'Error deleting feature'),
    });
  }
}

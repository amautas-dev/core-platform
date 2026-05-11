import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ProductsService } from '../services/products.service';
import { CountriesService } from '../services/countries.service';
import { ServicePlanService } from '../../platform-service-plans/services/service-plan.service';
import { Product } from '../models/product.interface';
import { ProductModule } from '../models/product-module.interface';
import type { ProductAddonRow } from '../models/product-addon.interface';
import type { CountryMarket } from '../models/country-market.interface';
import type { ServicePlan } from '../../platform-service-plans/models/service-plan.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatIconModule,
    MatTabsModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTableModule,
    MatSlideToggleModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './product-detail.page.html',
  styleUrls: ['./product-detail.page.scss'],
})
export class ProductDetailPage implements OnInit {
  private readonly productsService = inject(ProductsService);
  private readonly countriesService = inject(CountriesService);
  private readonly servicePlanService = inject(ServicePlanService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly paths = inject(PlatformRoutePathsService);

  readonly product = signal<Product | null>(null);
  readonly productModules = signal<ProductModule[]>([]);
  readonly productPlans = signal<ServicePlan[]>([]);
  readonly productAddons = signal<ProductAddonRow[]>([]);
  readonly countries = signal<CountryMarket[]>([]);
  readonly selectedCountry = signal<string>('AR');

  readonly loading = signal(false);
  readonly modulesLoading = signal(false);
  readonly plansLoading = signal(false);
  readonly addonsLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showInactivePlans = signal(false);

  readonly productId = computed(() => this.product()?.productId ?? null);
  readonly PERMISSIONS = PERMISSIONS;

  readonly plansDisplayedColumns = ['planCode', 'planName', 'price', 'currency', 'isActive', 'actions'];

  ngOnInit(): void {
    this.countriesService.list().subscribe({
      next: (list) => this.countries.set(list),
      error: () => this.countries.set([]),
    });

    const idParam = this.route.snapshot.paramMap.get('id');
    const numId = idParam ? parseInt(idParam, 10) : NaN;
    if (!isNaN(numId)) {
      this.loadProduct(numId);
    }

    this.route.queryParamMap.subscribe((params) => {
      const c = params.get('country');
      const next = c && c.trim() !== '' ? c.trim().toUpperCase().slice(0, 2) : 'AR';
      this.selectedCountry.set(next);
      if (!isNaN(numId)) {
        this.reloadRegional(numId);
      }
    });
  }

  onCountryChange(code: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { country: code },
      queryParamsHandling: 'merge',
    });
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.productsService.getProduct(id).subscribe({
      next: (p) => {
        this.product.set(p);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar producto');
        this.loading.set(false);
      },
    });
  }

  private reloadRegional(productId: number): void {
    const cc = this.selectedCountry();
    this.loadModules(productId, cc);
    this.loadPlans(productId, cc);
    this.loadAddons(productId, cc);
  }

  private loadModules(productId: number, country: string): void {
    this.modulesLoading.set(true);
    this.productsService.getProductModules(productId, country).subscribe({
      next: (list) => {
        this.productModules.set(list);
        this.modulesLoading.set(false);
      },
      error: () => this.modulesLoading.set(false),
    });
  }

  private loadPlans(productId: number, country: string): void {
    this.plansLoading.set(true);
    this.servicePlanService
      .getPlans({ productId, country, includeInactive: this.showInactivePlans() || undefined })
      .subscribe({
      next: (list) => {
        this.productPlans.set(list);
        this.plansLoading.set(false);
      },
      error: () => {
        this.productPlans.set([]);
        this.plansLoading.set(false);
      },
    });
  }

  private loadAddons(productId: number, country: string): void {
    this.addonsLoading.set(true);
    this.productsService.getProductAddons(productId, country).subscribe({
      next: (list) => {
        this.productAddons.set(list);
        this.addonsLoading.set(false);
      },
      error: () => {
        this.productAddons.set([]);
        this.addonsLoading.set(false);
      },
    });
  }

  editLinkWithCountry(): string {
    const pid = this.productId();
    if (pid == null) return this.paths.catalogProducts();
    return this.paths.catalogProductEdit(pid);
  }

  editQueryParams(): Record<string, string> {
    const cc = this.selectedCountry();
    return cc ? { country: cc } : {};
  }

  onShowInactivePlansChange(checked: boolean): void {
    this.showInactivePlans.set(checked);
    const pid = this.productId();
    if (pid != null) {
      this.loadPlans(pid, this.selectedCountry());
    }
  }
}

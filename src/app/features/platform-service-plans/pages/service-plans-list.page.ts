import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ServicePlanService } from '../services/service-plan.service';
import { ProductsService } from '../../platform-products/services/products.service';
import { CountriesService } from '../../platform-products/services/countries.service';
import { ServicePlan } from '../models/service-plan.interface';
import type { Product } from '../../platform-products/models/product.interface';
import type { CountryMarket } from '../../platform-products/models/country-market.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

@Component({
  selector: 'app-service-plans-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatPaginatorModule,
    MatSlideToggleModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './service-plans-list.page.html',
  styleUrls: ['./service-plans-list.page.scss'],
})
export class ServicePlansListPage implements OnInit {
  private readonly servicePlanService = inject(ServicePlanService);
  private readonly productsService = inject(ProductsService);
  private readonly countriesService = inject(CountriesService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly products = signal<Product[]>([]);
  readonly countries = signal<CountryMarket[]>([]);
  readonly filterProductId = signal<number>(0);
  readonly filterCountry = signal<string>('AR');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly showInactivePlans = signal(false);

  readonly dataSource = new MatTableDataSource<ServicePlan>([]);
  readonly displayedColumns: string[] = [
    'product',
    'planCode',
    'planName',
    'price',
    'currency',
    'isActive',
    'actions',
  ];

  /** Paginación cliente: 15 filas por página (listas del catálogo). */
  readonly pageSize = 15;
  readonly pageSizeOptions: number[] = [15, 30, 50];

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  readonly PERMISSIONS = PERMISSIONS;

  ngOnInit(): void {
    const q = this.route.snapshot.queryParamMap;
    const c = q.get('country');
    if (c && c.trim() !== '') {
      this.filterCountry.set(c.trim().toUpperCase().slice(0, 2));
    }
    const p = q.get('productId');
    if (p) {
      const n = parseInt(p, 10);
      if (!isNaN(n) && n > 0) {
        this.filterProductId.set(n);
      }
    }

    this.productsService.getProducts().subscribe({
      next: (list) => this.products.set(list.filter((p) => p.isActive)),
      error: () => this.products.set([]),
    });
    this.countriesService.list().subscribe({
      next: (list) => this.countries.set(list),
      error: () => this.countries.set([]),
    });
    this.loadPlans();
  }

  /** Query params para enlaces (lista, detalle, edición) y coherencia con la URL. */
  filterQueryParams(): Record<string, string | number> {
    const pid = this.filterProductId();
    const country = this.filterCountry();
    const q: Record<string, string | number> = { country };
    if (pid > 0) {
      q['productId'] = pid;
    }
    return q;
  }

  onFiltersChange(): void {
    const pid = this.filterProductId();
    const country = this.filterCountry();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        country,
        ...(pid > 0 ? { productId: pid } : {}),
      },
      replaceUrl: true,
    });
    this.loadPlans();
  }

  loadPlans(): void {
    this.loading.set(true);
    this.error.set(null);
    const pid = this.filterProductId();
    const country = this.filterCountry();
    const planParams: { country: string; productId?: number; includeInactive?: boolean } = {
      country,
      includeInactive: this.showInactivePlans() || undefined,
    };
    if (pid > 0) planParams.productId = pid;
    this.servicePlanService.getPlans(planParams)
      .subscribe({
        next: (list) => {
          this.dataSource.data = list;
          this.dataSource.paginator?.firstPage();
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al cargar planes');
          this.loading.set(false);
        },
      });
  }

  onShowInactivePlansChange(checked: boolean): void {
    this.showInactivePlans.set(checked);
    this.loadPlans();
  }

  /** Nombre del producto para la fila (API envía `productId`). */
  productLabel(plan: ServicePlan): string {
    const pid = plan.productId;
    if (pid == null || pid === undefined) {
      return '—';
    }
    const list = this.products();
    const found = list.find((p) => p.productId === Number(pid));
    if (!found) {
      return `#${pid}`;
    }
    return (found.productCode || found.productName || `#${pid}`).trim();
  }
}

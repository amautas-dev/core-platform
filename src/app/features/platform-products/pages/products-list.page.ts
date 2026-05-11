import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductsService } from '../services/products.service';
import { Product } from '../models/product.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { MessageBoxService } from 'ui-kit';
import { TranslateService } from '@ngx-translate/core';
import { escapeHtml } from '../../../core/utils/escape-html.util';

@Component({
  selector: 'app-products-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatPaginatorModule,
    MatTooltipModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './products-list.page.html',
  styleUrls: ['./products-list.page.scss'],
})
export class ProductsListPage implements OnInit {
  private readonly productsService = inject(ProductsService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);

  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  /** `productId` mientras corre dar de baja / reactivar */
  readonly togglingProductId = signal<number | null>(null);

  readonly dataSource = new MatTableDataSource<Product>([]);
  readonly displayedColumns: string[] = [
    'productCode',
    'productName',
    'modules',
    'tenantsUsing',
    'isActive',
    'actions',
  ];

  readonly PERMISSIONS = PERMISSIONS;
  readonly pageSize = 15;
  readonly pageSizeOptions: number[] = [15, 30, 50];

  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  ngOnInit(): void {
    this.setupTableBehavior();
    this.loadProducts();
  }

  private setupTableBehavior(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'productCode':
          return item.productCode ?? '';
        case 'productName':
          return item.productName ?? '';
        case 'modules':
          return item.moduleCount ?? -1;
        case 'tenantsUsing':
          return item.tenantCount ?? -1;
        case 'isActive':
          return item.isActive ? '1' : '0';
        default:
          return '';
      }
    };

    this.dataSource.filterPredicate = (item, filter) => {
      const text = [
        item.productCode ?? '',
        item.productName ?? '',
        String(item.moduleCount ?? ''),
        String(item.tenantCount ?? ''),
        item.isActive ? 'activo active' : 'inactivo inactive',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(filter);
    };
  }

  applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
    this.dataSource.paginator?.firstPage();
  }

  loadProducts(): void {
    this.loading.set(true);
    this.error.set(null);
    this.productsService.getProducts().subscribe({
      next: (list) => {
        this.products.set(list);
        this.dataSource.data = list;
        this.dataSource.paginator?.firstPage();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar productos');
        this.loading.set(false);
      },
    });
  }

  /** Modules column: show count when API provides it, otherwise "—" */
  modulesDisplay(product: Product): string | number {
    if (product.moduleCount !== undefined && product.moduleCount !== null) {
      return product.moduleCount;
    }
    return '—';
  }

  /** Tenants using: show count when API provides it, otherwise "—" */
  tenantsDisplay(product: Product): string | number {
    if (product.tenantCount !== undefined && product.tenantCount !== null) {
      return product.tenantCount;
    }
    return '—';
  }

  private productLabelSafe(p: Product): string {
    const code = (p.productCode ?? '').trim();
    const name = (p.productName ?? '').trim();
    const raw = code && name ? `${name} (${code})` : code || name || `#${p.productId}`;
    return escapeHtml(raw);
  }

  async confirmDeactivateProduct(p: Product): Promise<void> {
    if (!p.isActive) return;
    const label = this.productLabelSafe(p);
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('products.deactivateProductConfirmTitle'),
      html: `<p>${this.translate.instant('products.deactivateProductConfirmHtml', { label })}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.togglingProductId.set(p.productId);
    this.error.set(null);
    this.productsService.updateProduct(p.productId, { isActive: false }).subscribe({
      next: (updated) => {
        this.patchProductInList(updated);
        this.togglingProductId.set(null);
      },
      error: (err) => {
        this.togglingProductId.set(null);
        const msg = err?.error?.error ?? err?.message;
        this.error.set(
          typeof msg === 'string' ? msg : this.translate.instant('products.toggleProductStatusError'),
        );
      },
    });
  }

  async confirmReactivateProduct(p: Product): Promise<void> {
    if (p.isActive) return;
    const label = this.productLabelSafe(p);
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('products.reactivateProductConfirmTitle'),
      html: `<p>${this.translate.instant('products.reactivateProductConfirmHtml', { label })}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.togglingProductId.set(p.productId);
    this.error.set(null);
    this.productsService.updateProduct(p.productId, { isActive: true }).subscribe({
      next: (updated) => {
        this.patchProductInList(updated);
        this.togglingProductId.set(null);
      },
      error: (err) => {
        this.togglingProductId.set(null);
        const msg = err?.error?.error ?? err?.message;
        this.error.set(
          typeof msg === 'string' ? msg : this.translate.instant('products.toggleProductStatusError'),
        );
      },
    });
  }

  private patchProductInList(updated: Product): void {
    const next = this.products().map((x) => (x.productId === updated.productId ? { ...x, ...updated } : x));
    this.products.set(next);
    this.dataSource.data = next;
  }
}

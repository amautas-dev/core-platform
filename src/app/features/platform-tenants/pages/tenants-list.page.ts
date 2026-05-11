import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TenantService } from '../services/tenant.service';
import { Tenant } from '../models/tenant.interface';
import { ServicePlan } from '../models/service-plan.interface';
import { MessageBoxService } from 'ui-kit';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { TranslateService } from '@ngx-translate/core';
import { escapeHtml } from '../../../core/utils/escape-html.util';

@Component({
  selector: 'app-tenants-list-page',
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
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './tenants-list.page.html',
  styleUrls: ['./tenants-list.page.scss'],
})
export class TenantsListPage implements OnInit {
  private readonly tenantService = inject(TenantService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);

  readonly tenants = signal<Tenant[]>([]);
  readonly servicePlans = signal<ServicePlan[]>([]);
  readonly planNameById = signal<Record<number, string>>({});
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dataSource = new MatTableDataSource<Tenant>([]);
  readonly displayedColumns: string[] = [
    'code',
    'name',
    'plan',
    'status',
    'users',
    'modules',
    'created',
    'actions',
  ];

  readonly PERMISSIONS = PERMISSIONS;
  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  ngOnInit(): void {
    this.setupTableBehavior();
    this.loadServicePlans();
    this.loadTenants();
  }

  private setupTableBehavior(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'code':
          return item.tenantCode ?? '';
        case 'name':
          return item.tenantName ?? '';
        case 'plan':
          return this.getPlanDisplayName(item);
        case 'status':
          return item.isActive ? '1' : '0';
        case 'users':
          return item.usersCount ?? -1;
        case 'modules':
          return item.modulesCount ?? -1;
        case 'created':
          return item.createdAt ? new Date(item.createdAt).getTime() : 0;
        default:
          return '';
      }
    };

    this.dataSource.filterPredicate = (item, filter) => {
      const text = [
        item.tenantCode ?? '',
        item.tenantName ?? '',
        this.getPlanDisplayName(item),
        item.isActive ? 'activo active' : 'suspendido suspended',
        String(item.usersCount ?? ''),
        String(item.modulesCount ?? ''),
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(filter);
    };
  }

  applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
  }

  private loadServicePlans(): void {
    this.tenantService.getServicePlans({ includeInactive: true }).subscribe({
      next: (plans) => {
        this.servicePlans.set(plans);
        const map: Record<number, string> = {};
        plans.forEach((p) => (map[p.servicePlanId] = p.planName ?? p.servicePlanName ?? ''));
        this.planNameById.set(map);
      },
    });
  }

  /** Resolve plan name from id; show — when id is 0 or unknown. */
  getPlanDisplayName(tenant: Tenant): string {
    if (tenant.planName) return tenant.planName;
    const id = tenant.servicePlanId;
    if (id == null || id === 0) return '—';
    return this.planNameById()[id] ?? '—';
  }

  /** Users count or — when not provided by list API. */
  getUsersDisplay(tenant: Tenant): string | number {
    return tenant.usersCount ?? '—';
  }

  /** Modules count or — when not provided by list API. */
  getModulesDisplay(tenant: Tenant): string | number {
    return tenant.modulesCount ?? '—';
  }

  loadTenants(): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenantService.getTenants().subscribe({
      next: (list) => {
        this.tenants.set(list);
        this.dataSource.data = list;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar tenants');
        this.loading.set(false);
      },
    });
  }

  async suspendTenant(tenant: Tenant): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Suspender el tenant ${escapeHtml(tenant.tenantName ?? '')}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.tenantService.suspendTenant(tenant.tenantId).subscribe({
      next: () => this.loadTenants(),
      error: (err) => this.error.set(err?.message ?? 'Error al suspender'),
    });
  }

  async activateTenant(tenant: Tenant): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Activar el tenant ${escapeHtml(tenant.tenantName ?? '')}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.tenantService.activateTenant(tenant.tenantId).subscribe({
      next: () => this.loadTenants(),
      error: (err) => this.error.set(err?.message ?? 'Error al activar'),
    });
  }
}

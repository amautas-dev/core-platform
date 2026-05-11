import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { PlatformModulesService } from '../services/platform-modules.service';
import { PlatformFeaturesService } from '../../platform-features/services/platform-features.service';
import { PlatformModule } from '../models/platform-module.interface';
import type { PlatformFeature } from '../../platform-features/models/platform-feature.interface';
import { MessageBoxService } from 'ui-kit';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-modules-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatPaginatorModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './modules-list.page.html',
  styleUrls: ['./modules-list.page.scss'],
})
export class ModulesListPage implements OnInit {
  private readonly modulesService = inject(PlatformModulesService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly featuresService = inject(PlatformFeaturesService);
  private readonly i18n = inject(I18nService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);

  readonly modulesLoading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dataSource = new MatTableDataSource<PlatformModule>([]);
  /** Catálogo de features (para contar por módulo y sin módulo). */
  readonly catalogFeatures = signal<PlatformFeature[]>([]);
  readonly pageSize = 15;
  readonly pageSizeOptions: number[] = [15, 30, 50];

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  readonly PERMISSIONS = PERMISSIONS;
  readonly displayedColumns = ['code', 'name', 'featureCount', 'description', 'status', 'toggle', 'actions'];

  ngOnInit(): void {
    this.loadFeaturesCatalog();
    this.loadModules();
  }

  private loadFeaturesCatalog(): void {
    this.featuresService.getFeatures().subscribe({
      next: (list) => this.catalogFeatures.set(list),
      error: () => this.catalogFeatures.set([]),
    });
  }

  /** Features cuyo moduleCode coincide con el código del módulo de plataforma. */
  featureCountForModule(mod: PlatformModule): number {
    const code = (mod.code ?? '').trim().toLowerCase();
    if (!code) return 0;
    return this.catalogFeatures().filter((f) => {
      const mc = (f.moduleCode ?? '').trim().toLowerCase();
      return mc === code && f.isActive !== false;
    }).length;
  }

  unassignedFeatureCount(): number {
    return this.catalogFeatures().filter((f) => !(f.moduleCode && String(f.moduleCode).trim())).length;
  }

  unassignedFeaturesLabel(): string {
    const list = this.catalogFeatures().filter((f) => !(f.moduleCode && String(f.moduleCode).trim()));
    const codes = list
      .map((f) => f.code)
      .filter((c): c is string => c != null && c !== '')
      .slice(0, 12);
    return codes.length ? codes.join(', ') : '—';
  }

  loadModules(): void {
    this.modulesLoading.set(true);
    this.error.set(null);
    this.modulesService.getModules().subscribe({
      next: (list) => {
        this.dataSource.data = list;
        this.dataSource.paginator?.firstPage();
        this.modulesLoading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar módulos');
        this.modulesLoading.set(false);
      },
    });
  }

  onToggle(mod: PlatformModule, enabled: boolean): void {
    if (enabled) {
      this.modulesService.enableModule(mod.moduleId).subscribe({
        next: () => this.loadModules(),
        error: (err) => this.error.set(err?.message ?? 'Error al habilitar módulo'),
      });
    } else {
      this.modulesService.disableModule(mod.moduleId).subscribe({
        next: () => this.loadModules(),
        error: (err) => this.error.set(err?.message ?? 'Error al deshabilitar módulo'),
      });
    }
  }

  async deleteModule(mod: PlatformModule): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>${this.i18n.translate('modules.deleteConfirm')}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.error.set(null);
    this.modulesService.deleteModule(mod.moduleId).subscribe({
      next: () => this.loadModules(),
      error: (err) => this.error.set(err?.error?.error ?? err?.message ?? 'Error al eliminar'),
    });
  }
}

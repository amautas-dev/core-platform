import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { PermissionService } from '../../../core/permissions/permission.service';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

@Component({
  selector: 'app-platform-catalog-shell',
  standalone: true,
  imports: [RouterModule, MatTabsModule, PlatformTranslatePipe],
  templateUrl: './platform-catalog-shell.page.html',
  styleUrls: ['./platform-catalog-shell.page.scss'],
})
export class PlatformCatalogShellPage {
  private readonly perm = inject(PermissionService);
  private readonly paths = inject(PlatformRoutePathsService);
  private readonly language = inject(LanguageService);

  readonly tabs = computed(() => {
    this.language.localeVersion();
    const p = this.paths;
    const all: { path: string; labelKey: string; permission: string }[] = [
      { path: p.catalogProducts(), labelKey: 'menu.products', permission: PERMISSIONS.PRODUCTS_READ },
      {
        path: p.catalogServicePlans(),
        labelKey: 'menu.servicePlans',
        permission: PERMISSIONS.PLANS_READ,
      },
      { path: p.catalogModules(), labelKey: 'menu.modules', permission: PERMISSIONS.MODULES_READ },
      { path: p.catalogFeatures(), labelKey: 'menu.features', permission: PERMISSIONS.FEATURES_READ },
      { path: p.catalogConsoleRoles(), labelKey: 'menu.consoleRoles', permission: PERMISSIONS.FEATURES_READ },
    ];
    return all.filter((t) => this.perm.hasPermission(t.permission));
  });
}

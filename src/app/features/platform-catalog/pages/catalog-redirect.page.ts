import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PermissionService } from '../../../core/permissions/permission.service';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

/** Redirige `/catalog` o `/catalogo` al primer submódulo permitido (sin URL intermedia estable). */
@Component({
  selector: 'app-catalog-redirect',
  standalone: true,
  template: '',
})
export class CatalogRedirectPage implements OnInit {
  private readonly router = inject(Router);
  private readonly perm = inject(PermissionService);
  private readonly paths = inject(PlatformRoutePathsService);

  ngOnInit(): void {
    const candidates: { url: string; permission: string }[] = [
      { url: this.paths.catalogProducts(), permission: PERMISSIONS.PRODUCTS_READ },
      { url: this.paths.catalogServicePlans(), permission: PERMISSIONS.PLANS_READ },
      { url: this.paths.catalogModules(), permission: PERMISSIONS.MODULES_READ },
      { url: this.paths.catalogFeatures(), permission: PERMISSIONS.FEATURES_READ },
      { url: this.paths.catalogConsoleRoles(), permission: PERMISSIONS.FEATURES_READ },
    ];
    for (const { url, permission } of candidates) {
      if (this.perm.hasPermission(permission)) {
        void this.router.navigateByUrl(url, { replaceUrl: true });
        return;
      }
    }
    void this.router.navigateByUrl(this.paths.dashboard(), { replaceUrl: true });
  }
}

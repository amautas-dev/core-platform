import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { filter, map, startWith } from 'rxjs';
import { PermissionService } from '../../../core/permissions/permission.service';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { translateUrlPath } from '../../../core/routing/route-url-translate';

function pathOnly(url: string): string {
  return (url.split('?')[0]?.split('#')[0] ?? '').trim() || '/';
}

@Component({
  selector: 'app-platform-access-shell',
  standalone: true,
  imports: [RouterModule, MatTabsModule, PlatformTranslatePipe],
  templateUrl: './platform-access-shell.page.html',
  styleUrls: ['./platform-access-shell.page.scss'],
})
export class PlatformAccessShellPage {
  private readonly perm = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly paths = inject(PlatformRoutePathsService);
  private readonly language = inject(LanguageService);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => pathOnly(e.urlAfterRedirects)),
      startWith(pathOnly(this.router.url)),
    ),
    { initialValue: pathOnly(this.router.url) },
  );

  readonly tabs = computed(() => {
    this.language.localeVersion();
    const p = this.paths;
    const all: { path: string; labelKey: string; permission: string; tab: 'users' | 'roles' }[] = [
      { path: p.users(), labelKey: 'menu.users', permission: PERMISSIONS.USERS_READ, tab: 'users' },
      { path: p.usersRoles(), labelKey: 'menu.roles', permission: PERMISSIONS.ROLES_READ, tab: 'roles' },
    ];
    return all.filter((t) => this.perm.hasPermission(t.permission));
  });

  /** Roles vs usuarios: comparar rutas canónicas en inglés. */
  readonly usersTabActive = computed(() => {
    const p = translateUrlPath(this.currentPath(), 'en');
    if (p.startsWith('/users/roles')) return false;
    return p === '/users' || p.startsWith('/users/');
  });

  readonly rolesTabActive = computed(() => {
    const p = translateUrlPath(this.currentPath(), 'en');
    return p === '/users/roles' || p.startsWith('/users/roles/');
  });
}

import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { filter } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { LayoutMenuService } from '../menu/layout-menu.service';
import { SessionService } from '../../core/session/session.service';
import { AuthService } from '../../core/auth/auth.service';
import { PlatformSettingsService } from '../../features/platform-settings/services/platform-settings.service';
import { DbTranslationsLoaderService } from '../../core/i18n/db-translations.loader';
import { MenuItem } from '../../shared/models/menu-item.model';
import { PERMISSIONS } from '../../core/permissions/permissions.const';
import { LanguageService } from '../../core/i18n/language.service';
import { PlatformRoutePathsService } from '../../core/routing/platform-route-paths.service';
import { translateUrlPath } from '../../core/routing/route-url-translate';
import { ActiveMarketService } from '../../core/market/active-market.service';
import { ActiveMarketBarComponent } from '../active-market-bar/active-market-bar.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    SidebarComponent,
    HeaderComponent,
    ActiveMarketBarComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.scss'],
})
export class ShellComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly breakpoint = inject(BreakpointObserver);
  private readonly menuService = inject(LayoutMenuService);
  private readonly session = inject(SessionService);
  private readonly auth = inject(AuthService);
  private readonly dbTranslations = inject(DbTranslationsLoaderService);
  private readonly settingsService = inject(PlatformSettingsService);
  private readonly paths = inject(PlatformRoutePathsService);
  private readonly translate = inject(TranslateService);
  private readonly language = inject(LanguageService);
  private readonly activeMarket = inject(ActiveMarketService);

  private _collapsed = signal(false);
  private _isMobile = signal(false);

  readonly isMobile = computed(() => this._isMobile());
  readonly isCollapsed = computed(() => this._collapsed());
  readonly currentTitle = signal('');
  readonly menuItems = this.menuService.items;
  readonly userName = computed(() => this.session.user()?.name ?? '');
  readonly avatarUrl = 'assets/images/default-user.jpg';

  ngOnInit(): void {
    this.activeMarket.init();
    this.refreshMenu();
    this.translate.onLangChange.subscribe(() => this.refreshMenu());
    this.currentTitle.set(this.menuService.getTitleKeyFromPath(this.router.url));
    this.settingsService.getSettings().subscribe({
      next: (dto) => this.settingsService.applyBrandingToDocument(dto),
    });
    if (this.auth.isLoggedInSignal()) {
      this.dbTranslations.loadFromDb().subscribe();
    }
  }

  constructor() {
    this.breakpoint
      .observe([Breakpoints.Handset, '(max-width: 900px)'])
      .subscribe((res) => {
        this._collapsed.set(res.matches);
        this._isMobile.set(res.matches);
      });

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const url = e.urlAfterRedirects.split('?')[0] ?? '';
        const qs = e.urlAfterRedirects.includes('?') ? '?' + e.urlAfterRedirects.split('?')[1] : '';
        const lang = this.language.currentLang;
        const fixed = translateUrlPath(url, lang);
        if (fixed !== url) {
          void this.router.navigateByUrl(fixed + qs, { replaceUrl: true });
          return;
        }
        this.currentTitle.set(this.menuService.getTitleKeyFromPath(e.urlAfterRedirects));
        if (this._isMobile()) this._collapsed.set(true);
      });
  }

  private refreshMenu(): void {
    const p = this.paths;
    const items: MenuItem[] = [
      { id: 1, label: 'Dashboard', icon: 'dashboard', path: p.dashboard(), order: 0, translationKey: 'menu.dashboard' },
      {
        id: 2,
        label: 'Tenants',
        icon: 'business',
        path: p.tenants(),
        order: 1,
        permission: PERMISSIONS.TENANTS_READ,
        translationKey: 'menu.tenants',
      },
      {
        id: 3,
        label: 'Catálogo',
        icon: 'apps',
        path: p.catalogProducts(),
        order: 2,
        anyOfPermissions: [
          PERMISSIONS.PRODUCTS_READ,
          PERMISSIONS.PLANS_READ,
          PERMISSIONS.MODULES_READ,
          PERMISSIONS.FEATURES_READ,
        ],
        translationKey: 'menu.catalog',
        activeWhenUrlStartsWithAny: ['/catalog', '/catalogo'],
      },
      {
        id: 6,
        label: 'Usuarios y roles',
        icon: 'manage_accounts',
        path: p.users(),
        order: 5,
        anyOfPermissions: [PERMISSIONS.USERS_READ, PERMISSIONS.ROLES_READ],
        translationKey: 'menu.usersAndRoles',
        activeWhenUrlStartsWithAny: ['/users', '/usuarios'],
      },
      {
        id: 8,
        label: 'Traducciones',
        icon: 'translate',
        path: p.translations(),
        order: 7,
        translationKey: 'menu.translations',
      },
      {
        id: 9,
        label: 'Settings',
        icon: 'settings',
        path: p.settings(),
        order: 8,
        translationKey: 'menu.settings',
      },
      {
        id: 10,
        label: 'System health',
        icon: 'monitor_heart',
        path: p.systemHealth(),
        order: 9,
        translationKey: 'menu.systemHealth',
      },
    ];
    this.menuService.setMenuItems(items);
  }

  toggleSidebar(): void {
    this._collapsed.update((v) => !v);
  }

  logout(): void {
    this.auth.logout();
  }
}

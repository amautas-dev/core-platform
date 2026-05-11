import { Injectable, inject, signal } from '@angular/core';
import { MenuItem } from '../../shared/models/menu-item.model';
import { I18nService } from '../../core/i18n/i18n.service';
import { translateUrlPath } from '../../core/routing/route-url-translate';

@Injectable({ providedIn: 'root' })
export class LayoutMenuService {
  private readonly i18n = inject(I18nService);
  private _items = signal<MenuItem[]>([]);
  readonly items = this._items.asReadonly();

  setMenuItems(items: MenuItem[]): void {
    this._items.set([...items]);
  }

  /** Returns the translation key for the page title (e.g. "menu.dashboard"). Use with translate pipe. */
  getTitleKeyFromPath(path: string): string {
    const pathOnly = (path.split('?')[0]?.split('#')[0] ?? path).trim() || '/';
    const enPath = translateUrlPath(pathOnly, 'en');

    const staticTitles: Record<string, string> = {
      '/profile': 'menu.profile',
    };
    if (staticTitles[enPath]) return staticTitles[enPath];

    const catalogPrefixes: [string, string][] = [
      ['/catalog/products', 'menu.products'],
      ['/catalog/service-plans', 'menu.servicePlans'],
      ['/catalog/modules', 'menu.modules'],
      ['/catalog/features', 'menu.features'],
      ['/catalog/console-roles', 'menu.consoleRoles'],
    ];
    for (const [prefix, key] of catalogPrefixes) {
      if (enPath === prefix || enPath.startsWith(prefix + '/')) {
        return key;
      }
    }

    if (/^\/tenants\/[^/]+\/billing$/.test(enPath)) {
      return 'tenants.billingTitle';
    }
    if (enPath === '/users/roles' || enPath.startsWith('/users/roles/')) {
      return 'menu.roles';
    }
    if (enPath === '/users' || enPath.startsWith('/users/')) {
      return 'menu.users';
    }

    const find = (list: readonly MenuItem[]): string | null => {
      for (const item of list) {
        const itemEn = translateUrlPath(item.path, 'en');
        if (itemEn === enPath || enPath.startsWith(itemEn + '/')) return item.translationKey ?? null;
        if (item.children?.length) {
          const found = find(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return find(this._items()) ?? 'common.home';
  }

  /** Returns translated title for the given path. */
  getTitleFromPath(path: string): string {
    return this.i18n.translate(this.getTitleKeyFromPath(path));
  }
}

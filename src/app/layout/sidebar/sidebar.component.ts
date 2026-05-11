import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  computed,
  input,
} from '@angular/core';
import { PlatformSettingsService } from '../../features/platform-settings/services/platform-settings.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MenuItem } from '../../shared/models/menu-item.model';
import { PermissionService } from '../../core/permissions/permission.service';
import { PlatformTranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, PlatformTranslatePipe],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
})
export class SidebarComponent {
  private readonly permissionService = inject(PermissionService);
  private readonly router = inject(Router);
  private readonly platformSettings = inject(PlatformSettingsService);

  menuItems = input<MenuItem[]>([]);
  @Input() collapsed = false;
  @Input() isMobile = false;

  @Output() toggle = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  /** Menu items filtered by current user permissions. Items without permission are always shown. */
  readonly filteredMenuItems = computed(() => this.filterByPermission(this.menuItems()));

  get toggleIcon(): string {
    return this.collapsed ? 'chevron_right' : 'chevron_left';
  }

  /** Logo de marca plataforma (settings) o fallback Amautas. */
  sidebarLogoSrc(): string {
    const fromApi = this.collapsed
      ? this.platformSettings.shellSidebarLogoCollapsedSrc()
      : this.platformSettings.shellSidebarLogoExpandedSrc();
    if (fromApi) return fromApi;
    return this.collapsed
      ? 'assets/brand/amautas-logo-alt-reduc.png'
      : 'assets/brand/amautas-logo-alt.png';
  }

  /** Evita icono roto si la URL de la API falla (404, red, etc.). */
  onSidebarLogoImgError(ev: Event): void {
    const img = ev.target as HTMLImageElement;
    const fallback = this.collapsed
      ? 'assets/brand/amautas-logo-alt-reduc.png'
      : 'assets/brand/amautas-logo-alt.png';
    try {
      if (img.src === new URL(fallback, document.baseURI).href) return;
    } catch {
      /* ignore */
    }
    img.onerror = null;
    img.src = fallback;
  }

  private filterByPermission(items: readonly MenuItem[]): MenuItem[] {
    return items
      .filter((item) => this.canSeeItem(item))
      .map((item) =>
        item.children?.length
          ? { ...item, children: this.filterByPermission(item.children) }
          : item
      );
  }

  private canSeeItem(item: MenuItem): boolean {
    if (item.anyOfPermissions?.length) {
      return item.anyOfPermissions.some((p) => this.permissionService.hasPermission(p));
    }
    if (item.permission) {
      return this.permissionService.hasPermission(item.permission);
    }
    return true;
  }

  /** Activo si la ruta coincide con `path` o es un hijo; con `activeWhenUrlStartsWith` usa prefijo. */
  isMenuLinkActive(item: MenuItem): boolean {
    const pathOnly = this.router.url.split('?')[0]?.split('#')[0] ?? '';
    if (item.activeWhenUrlStartsWithAny?.length) {
      return item.activeWhenUrlStartsWithAny.some(
        (b) => pathOnly === b || pathOnly.startsWith(b + '/')
      );
    }
    if (item.activeWhenUrlStartsWith) {
      const b = item.activeWhenUrlStartsWith;
      return pathOnly === b || pathOnly.startsWith(b + '/');
    }
    const p = item.path;
    return pathOnly === p || pathOnly.startsWith(p + '/');
  }
}

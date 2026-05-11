import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CdkDragDrop,
  DragDropModule,
  moveItemInArray,
  transferArrayItem,
} from '@angular/cdk/drag-drop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { forkJoin } from 'rxjs';
import {
  ConsoleRolesService,
  type PermissionCatalogEntry,
  type MenuGroupDto,
} from '../services/console-roles.service';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { PermissionService } from '../../../core/permissions/permission.service';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';

type ShowTri = 'inherit' | 'yes' | 'no';

interface MenuItemUi {
  clientId: string;
  featureId: string;
  titleOverride: string;
  show: ShowTri;
}

interface MenuGroupUi {
  clientId: string;
  title: string;
  items: MenuItemUi[];
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function mapApiMenuToUi(groups: MenuGroupDto[]): MenuGroupUi[] {
  return groups.map((g) => ({
    clientId: newId(),
    title: g.title,
    items: g.items.map((it) => ({
      clientId: newId(),
      featureId: it.featureId,
      titleOverride: it.titleOverride ?? '',
      show: it.showInSidebar === null ? 'inherit' : it.showInSidebar ? 'yes' : 'no',
    })),
  }));
}

@Component({
  selector: 'app-console-role-features-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DragDropModule,
    MatCardModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    MatExpansionModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './console-role-features.page.html',
  styleUrls: ['./console-role-features.page.scss'],
})
export class ConsoleRoleFeaturesPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly paths = inject(PlatformRoutePathsService);
  private readonly consoleRolesService = inject(ConsoleRolesService);
  private readonly permission = inject(PermissionService);

  /** Producto del catálogo para las llamadas API (query ?productCode= o respuesta del editor). */
  private activeProductCode = 'CLUB';

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saveError = signal(false);
  readonly permissionCatalog = signal<PermissionCatalogEntry[]>([]);
  readonly permissionSelected = signal<Set<string>>(new Set());
  readonly menuGroups = signal<MenuGroupUi[]>([]);
  readonly saving = signal(false);
  readonly roleTitle = signal<{ code: string; name: string } | null>(null);
  /** Código de producto del catálogo (respuesta API; no asumir solo un producto). */
  readonly productCode = signal<string>('');
  /** Agrupa por módulo; todas las entradas del catálogo API (sin filtrar en cliente). */
  readonly catalogByModule = computed(() => {
    const list = [...this.permissionCatalog()];
    list.sort((a, b) => {
      const ma = a.moduleCode || '';
      const mb = b.moduleCode || '';
      if (ma !== mb) return ma.localeCompare(mb);
      return a.name.localeCompare(b.name);
    });
    const map = new Map<string, PermissionCatalogEntry[]>();
    for (const e of list) {
      const key = e.moduleCode || '—';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    const UNASSIGNED = '—';
    const entries = [...map.entries()];
    entries.sort((a, b) => {
      if (a[0] === UNASSIGNED && b[0] !== UNASSIGNED) return 1;
      if (b[0] === UNASSIGNED && a[0] !== UNASSIGNED) return -1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  });

  readonly catalogById = computed(() => {
    const m = new Map<string, PermissionCatalogEntry>();
    for (const e of this.permissionCatalog()) {
      m.set(e.featureId, e);
    }
    return m;
  });

  /** Features con permiso y aún no colocadas en ningún grupo del menú. */
  readonly availableToAddToMenu = computed(() => {
    const used = new Set<string>();
    for (const g of this.menuGroups()) {
      for (const it of g.items) used.add(it.featureId);
    }
    return this.permissionCatalog().filter(
      (e) => this.permissionSelected().has(e.featureId) && !used.has(e.featureId),
    );
  });

  readonly canSave = computed(() => this.permission.hasPermission(PERMISSIONS.FEATURES_UPDATE));
  readonly validationError = signal(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      void this.router.navigateByUrl(this.paths.catalogConsoleRoles());
      return;
    }
    this.activeProductCode =
      this.route.snapshot.queryParamMap.get('productCode')?.trim() || 'CLUB';
    forkJoin({
      catalog: this.consoleRolesService.listAssignableFeatures(this.activeProductCode),
      editor: this.consoleRolesService.getRoleFeatures(id, this.activeProductCode),
    }).subscribe({
      next: ({ catalog, editor }) => {
        this.permissionCatalog.set(catalog.permissionCatalog ?? []);
        const pc = (editor.product?.productCode ?? this.activeProductCode).trim() || 'CLUB';
        this.activeProductCode = pc;
        this.productCode.set(pc);
        this.roleTitle.set({ code: editor.role.code, name: editor.role.name });
        this.permissionSelected.set(new Set(editor.permissionFeatureIds ?? []));
        const mg = editor.menuGroups?.length
          ? mapApiMenuToUi(editor.menuGroups)
          : [];
        this.menuGroups.set(mg);
        this.loading.set(false);
        this.loadError.set(false);
      },
      error: () => {
        this.permissionCatalog.set([]);
        this.permissionSelected.set(new Set());
        this.menuGroups.set([]);
        this.productCode.set('');
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  back(): void {
    void this.router.navigateByUrl(this.paths.catalogConsoleRoles());
  }

  labelForFeature(featureId: string): string {
    const e = this.catalogById().get(featureId);
    if (!e) return featureId;
    return e.name?.trim() || e.code;
  }

  togglePermission(featureId: string, checked: boolean): void {
    const next = new Set(this.permissionSelected());
    if (checked) {
      next.add(featureId);
    } else {
      next.delete(featureId);
      this.menuGroups.update((groups) =>
        groups.map((g) => ({
          ...g,
          items: g.items.filter((it) => it.featureId !== featureId),
        })),
      );
    }
    this.permissionSelected.set(next);
  }

  isChecked(featureId: string): boolean {
    return this.permissionSelected().has(featureId);
  }

  addGroup(): void {
    this.menuGroups.update((g) => [
      ...g,
      {
        clientId: newId(),
        title: '',
        items: [],
      },
    ]);
  }

  removeGroup(clientId: string): void {
    this.menuGroups.update((g) => g.filter((x) => x.clientId !== clientId));
  }

  updateGroupTitle(clientId: string, title: string): void {
    this.menuGroups.update((groups) =>
      groups.map((g) => (g.clientId === clientId ? { ...g, title } : g)),
    );
  }

  addItemToGroup(groupClientId: string, featureId: string | null | undefined): void {
    if (featureId == null || featureId === '') return;
    this.menuGroups.update((groups) =>
      groups.map((g) => {
        if (g.clientId !== groupClientId) return g;
        if (g.items.some((it) => it.featureId === featureId)) return g;
        return {
          ...g,
          items: [
            ...g.items,
            {
              clientId: newId(),
              featureId,
              titleOverride: '',
              show: 'inherit',
            },
          ],
        };
      }),
    );
  }

  removeItem(groupClientId: string, itemClientId: string): void {
    this.menuGroups.update((groups) =>
      groups.map((g) =>
        g.clientId === groupClientId
          ? { ...g, items: g.items.filter((it) => it.clientId !== itemClientId) }
          : g,
      ),
    );
  }

  updateItemTitle(groupClientId: string, itemClientId: string, value: string): void {
    this.menuGroups.update((groups) =>
      groups.map((g) => {
        if (g.clientId !== groupClientId) return g;
        return {
          ...g,
          items: g.items.map((it) =>
            it.clientId === itemClientId ? { ...it, titleOverride: value } : it,
          ),
        };
      }),
    );
  }

  updateItemShow(groupClientId: string, itemClientId: string, show: ShowTri): void {
    this.menuGroups.update((groups) =>
      groups.map((g) => {
        if (g.clientId !== groupClientId) return g;
        return {
          ...g,
          items: g.items.map((it) => (it.clientId === itemClientId ? { ...it, show } : it)),
        };
      }),
    );
  }

  moveGroupUp(clientId: string): void {
    const groups = [...this.menuGroups()];
    const i = groups.findIndex((g) => g.clientId === clientId);
    if (i <= 0) return;
    [groups[i - 1], groups[i]] = [groups[i], groups[i - 1]];
    this.menuGroups.set(groups);
  }

  moveGroupDown(clientId: string): void {
    const groups = [...this.menuGroups()];
    const i = groups.findIndex((g) => g.clientId === clientId);
    if (i < 0 || i >= groups.length - 1) return;
    [groups[i], groups[i + 1]] = [groups[i + 1], groups[i]];
    this.menuGroups.set(groups);
  }

  dropItem(event: CdkDragDrop<MenuItemUi[]>): void {
    if (!this.canSave()) return;
    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex,
      );
    }
    this.menuGroups.set(
      this.menuGroups().map((g) => ({
        ...g,
        items: [...g.items],
      })),
    );
  }

  save(): void {
    if (!this.canSave()) return;
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.validationError.set(false);
    for (const g of this.menuGroups()) {
      if (!g.title.trim()) {
        this.validationError.set(true);
        return;
      }
    }
    this.saveError.set(false);
    this.saving.set(true);
    const body = {
      permissionFeatureIds: [...this.permissionSelected()],
      menu: {
        groups: this.menuGroups().map((g) => ({
          title: g.title.trim(),
          items: g.items.map((it) => ({
            featureId: it.featureId,
            titleOverride: it.titleOverride.trim() ? it.titleOverride.trim().slice(0, 120) : null,
            showInSidebar:
              it.show === 'inherit' ? null : it.show === 'yes' ? true : false,
          })),
        })),
      },
    };
    this.consoleRolesService.putRoleFeatures(id, body, this.activeProductCode).subscribe({
      next: () => {
        this.saving.set(false);
        void this.router.navigateByUrl(this.paths.catalogConsoleRoles());
      },
      error: () => {
        this.saving.set(false);
        this.saveError.set(true);
      },
    });
  }
}

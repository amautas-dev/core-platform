import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin } from 'rxjs';
import {
  TenantService,
  TenantConsoleFeatureTreeNode,
  TenantConsoleRoleFeatureItem,
  TenantConsoleRoleRow,
} from '../services/tenant.service';

export interface PlatformTenantRoleFeaturesDialogData {
  tenantId: number;
  role: TenantConsoleRoleRow;
}

export interface FlatFeatureRow {
  node: TenantConsoleFeatureTreeNode;
  depth: number;
}

type ShowTri = 'inherit' | 'yes' | 'no';

interface RowMeta {
  order: string;
  show: ShowTri;
}

function flattenFeatureTree(nodes: TenantConsoleFeatureTreeNode[], depth = 0): FlatFeatureRow[] {
  const out: FlatFeatureRow[] = [];
  for (const n of nodes) {
    out.push({ node: n, depth });
    if (n.children?.length) {
      out.push(...flattenFeatureTree(n.children, depth + 1));
    }
  }
  return out;
}

function collectFeatureTreeIds(nodes: TenantConsoleFeatureTreeNode[]): Set<string> {
  const ids = new Set<string>();
  const walk = (list: TenantConsoleFeatureTreeNode[]) => {
    for (const n of list) {
      ids.add(n.id);
      if (n.children?.length) walk(n.children);
    }
  };
  walk(nodes);
  return ids;
}

@Component({
  selector: 'app-platform-tenant-role-features-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './platform-tenant-role-features-dialog.component.html',
  styleUrls: ['./platform-tenant-role-features-dialog.component.scss'],
})
export class PlatformTenantRoleFeaturesDialogComponent {
  private readonly ref = inject(MatDialogRef<PlatformTenantRoleFeaturesDialogComponent>);
  readonly data = inject<PlatformTenantRoleFeaturesDialogData>(MAT_DIALOG_DATA);
  private readonly tenantService = inject(TenantService);

  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saveError = signal(false);
  readonly tree = signal<TenantConsoleFeatureTreeNode[]>([]);
  readonly selectedIds = signal<Set<string>>(new Set());
  readonly featureMeta = signal<Map<string, RowMeta>>(new Map());
  readonly saving = signal(false);

  readonly flatRows = computed(() => flattenFeatureTree(this.tree()));

  constructor() {
    const tid = this.data.tenantId;
    const roleId = this.data.role.id;
    forkJoin({
      catalog: this.tenantService.listTenantConsoleAssignableFeatures(tid),
      assigned: this.tenantService.getTenantConsoleRoleFeatures(tid, roleId),
    }).subscribe({
      next: ({ catalog, assigned }) => {
        const tree = catalog.items ?? [];
        this.tree.set(tree);
        const catalogIds = collectFeatureTreeIds(tree);
        const selected = new Set<string>();
        const meta = new Map<string, RowMeta>();
        const items: TenantConsoleRoleFeatureItem[] = assigned.items ?? [];
        if (items.length > 0) {
          for (const it of items) {
            if (!catalogIds.has(it.featureId)) continue;
            selected.add(it.featureId);
            meta.set(it.featureId, {
              order: it.menuSortOrder != null ? String(it.menuSortOrder) : '',
              show:
                it.showInSidebar === null ? 'inherit' : it.showInSidebar ? 'yes' : 'no',
            });
          }
        } else {
          for (const id of assigned.featureIds ?? []) {
            if (!catalogIds.has(id)) continue;
            selected.add(id);
            meta.set(id, { order: '', show: 'inherit' });
          }
        }
        this.selectedIds.set(selected);
        this.featureMeta.set(meta);
        this.loading.set(false);
        this.loadError.set(false);
      },
      error: () => {
        this.tree.set([]);
        this.selectedIds.set(new Set());
        this.featureMeta.set(new Map());
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  isChecked(id: string): boolean {
    return this.selectedIds().has(id);
  }

  getMeta(id: string): RowMeta {
    return this.featureMeta().get(id) ?? { order: '', show: 'inherit' };
  }

  toggle(id: string, checked: boolean): void {
    const next = new Set(this.selectedIds());
    const meta = new Map(this.featureMeta());
    if (checked) {
      next.add(id);
      if (!meta.has(id)) {
        meta.set(id, { order: '', show: 'inherit' });
      }
    } else {
      next.delete(id);
    }
    this.selectedIds.set(next);
    this.featureMeta.set(meta);
  }

  setOrder(id: string, value: string): void {
    const meta = new Map(this.featureMeta());
    const cur = meta.get(id) ?? { order: '', show: 'inherit' };
    meta.set(id, { ...cur, order: value });
    this.featureMeta.set(meta);
  }

  setShow(id: string, value: ShowTri): void {
    const meta = new Map(this.featureMeta());
    const cur = meta.get(id) ?? { order: '', show: 'inherit' };
    meta.set(id, { ...cur, show: value });
    this.featureMeta.set(meta);
  }

  cancel(): void {
    this.ref.close();
  }

  save(): void {
    this.saveError.set(false);
    this.saving.set(true);
    const catalogIds = collectFeatureTreeIds(this.tree());
    const ids = [...this.selectedIds()].filter((id) => catalogIds.has(id));
    const items = ids.map((featureId) => {
      const m = this.featureMeta().get(featureId) ?? { order: '', show: 'inherit' as ShowTri };
      let menuSortOrder: number | null = null;
      if (m.order.trim() !== '') {
        const n = Number(m.order);
        menuSortOrder = Number.isFinite(n) ? n : null;
      }
      let showInSidebar: boolean | null = null;
      if (m.show === 'yes') showInSidebar = true;
      else if (m.show === 'no') showInSidebar = false;
      return { featureId, menuSortOrder, showInSidebar };
    });
    this.tenantService
      .putTenantConsoleRoleFeatures(this.data.tenantId, this.data.role.id, { items })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.ref.close(true);
        },
        error: () => {
          this.saving.set(false);
          this.saveError.set(true);
        },
      });
  }
}

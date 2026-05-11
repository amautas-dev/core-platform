import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { RoleService } from '../services/role.service';
import { Role } from '../models/role.interface';
import { MessageBoxService } from 'ui-kit';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { CONFIG_DRIVEN_ROLES_MESSAGE } from './role-form.page';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { TranslateService } from '@ngx-translate/core';
import { escapeHtml } from '../../../core/utils/escape-html.util';

@Component({
  selector: 'app-roles-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './roles-list.page.html',
  styleUrls: ['./roles-list.page.scss'],
})
export class RolesListPage implements OnInit {
  private readonly roleService = inject(RoleService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);

  readonly roles = signal<Role[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dataSource = new MatTableDataSource<Role>([]);
  readonly displayedColumns: string[] = [
    'roleCode',
    'roleName',
    'description',
    'isActive',
    'actions',
  ];

  readonly PERMISSIONS = PERMISSIONS;

  ngOnInit(): void {
    this.loadRoles();
  }

  loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);
    this.roleService.getRoles().subscribe({
      next: (list) => {
        this.roles.set(list);
        this.dataSource.data = list;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar roles');
        this.loading.set(false);
      },
    });
  }

  async deactivateRole(role: Role): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Desactivar el rol ${escapeHtml(role.roleName)}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.roleService.deactivateRole(role.roleId).subscribe({
      next: () => this.loadRoles(),
      error: (err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 501) {
          this.error.set(CONFIG_DRIVEN_ROLES_MESSAGE);
          return;
        }
        this.error.set((err as Error)?.message ?? 'Error al desactivar');
      },
    });
  }
}

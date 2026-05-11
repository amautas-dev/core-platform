import { Component, inject, signal, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MessageBoxService } from 'ui-kit';
import { PlatformUserService } from '../services/platform-user.service';
import { PlatformUser } from '../models/platform-user.interface';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { TranslateService } from '@ngx-translate/core';
import { escapeHtml } from '../../../core/utils/escape-html.util';

@Component({
  selector: 'app-users-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
  ],
  templateUrl: './users-list.page.html',
  styleUrls: ['./users-list.page.scss'],
})
export class UsersListPage implements OnInit {
  private readonly platformUserService = inject(PlatformUserService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);

  readonly users = signal<PlatformUser[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dataSource = new MatTableDataSource<PlatformUser>([]);
  readonly displayedColumns: string[] = [
    'username',
    'email',
    'roleCode',
    'isActive',
    'lastLoginAt',
    'actions',
  ];

  readonly PERMISSIONS = PERMISSIONS;
  @ViewChild(MatSort)
  set matSort(sort: MatSort | undefined) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  ngOnInit(): void {
    this.setupTableBehavior();
    this.loadUsers();
  }

  private setupTableBehavior(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'username':
          return item.username ?? '';
        case 'email':
          return item.email ?? '';
        case 'roleCode':
          return item.roleCode ?? '';
        case 'isActive':
          return item.isActive ? '1' : '0';
        case 'lastLoginAt':
          return item.lastLoginAt ? new Date(item.lastLoginAt).getTime() : 0;
        default:
          return '';
      }
    };

    this.dataSource.filterPredicate = (item, filter) => {
      const text = [
        item.username ?? '',
        item.email ?? '',
        item.roleCode ?? '',
        item.isActive ? 'activo active' : 'inactivo inactive',
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(filter);
    };
  }

  applyFilter(value: string): void {
    this.dataSource.filter = value.trim().toLowerCase();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.error.set(null);
    this.platformUserService.getUsers().subscribe({
      next: (list) => {
        this.users.set(list);
        this.dataSource.data = list;
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar usuarios');
        this.loading.set(false);
      },
    });
  }

  async deactivateUser(user: PlatformUser): Promise<void> {
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Desactivar a ${escapeHtml(user.username)}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.platformUserService.deactivateUser(user.platformUserId).subscribe({
      next: () => this.loadUsers(),
      error: (err) => this.error.set(err?.message ?? 'Error al desactivar'),
    });
  }
}

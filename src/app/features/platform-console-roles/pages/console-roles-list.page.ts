import { Component, OnInit, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ConsoleRolesService, type ConsoleRoleListItem } from '../services/console-roles.service';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

@Component({
  selector: 'app-console-roles-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './console-roles-list.page.html',
  styleUrls: ['./console-roles-list.page.scss'],
})
export class ConsoleRolesListPage implements OnInit {
  private readonly consoleRolesService = inject(ConsoleRolesService);
  readonly paths = inject(PlatformRoutePathsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly dataSource = new MatTableDataSource<ConsoleRoleListItem>([]);
  readonly pageSize = 10;
  readonly pageSizeOptions: number[] = [5, 10, 25, 50];

  @ViewChild(MatPaginator) set matPaginator(p: MatPaginator | undefined) {
    if (p) {
      this.dataSource.paginator = p;
      p.pageSize = this.pageSize;
    }
  }

  readonly displayedColumns = ['productCode', 'code', 'name', 'featureCount', 'actions'];

  /** Query para la pantalla de edición: el rol pertenece a este producto del catálogo. */
  configureQueryParams(row: ConsoleRoleListItem): Record<string, string> {
    const pc = row.productCode?.trim();
    return pc ? { productCode: pc } : { productCode: 'CLUB' };
  }

  ngOnInit(): void {
    this.loading.set(true);
    this.error.set(null);
    this.consoleRolesService.listAll().subscribe({
      next: (res) => {
        this.dataSource.data = res.items ?? [];
        this.dataSource.paginator?.firstPage();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.error ?? err?.message ?? 'Error');
        this.dataSource.data = [];
        this.loading.set(false);
      },
    });
  }
}

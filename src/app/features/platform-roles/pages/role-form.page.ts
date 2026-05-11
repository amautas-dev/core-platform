import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../models/create-role.dto';
import { UpdateRoleDto } from '../models/update-role.dto';
import { switchMap } from 'rxjs';
import {
  groupPermissionsFromBackend,
  expandRolePermissions,
} from '../models/permissions-by-module';
import type { PermissionGroup } from '../models/permissions-by-module';

/** Mensaje cuando el backend devuelve 501 (roles definidos por configuración). */
export const CONFIG_DRIVEN_ROLES_MESSAGE =
  'Los roles y permisos están definidos por configuración en el backend. No es posible guardar cambios desde esta interfaz.';

@Component({
  selector: 'app-role-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatIconModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './role-form.page.html',
  styleUrls: ['./role-form.page.scss'],
})
export class RoleFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly roleService = inject(RoleService);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly roleId = signal<number | null>(null);
  readonly selectedPermissions = signal<Set<string>>(new Set());
  /** Cargado desde GET /api/v1/platform/permissions; agrupado por módulo en orden fijo. */
  readonly permissionsByModule = signal<PermissionGroup[]>([]);

  readonly form = this.fb.nonNullable.group({
    roleCode: ['', [Validators.required, Validators.minLength(2)]],
    roleName: ['', Validators.required],
    description: [''],
  });

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    const numId = idParam ? parseInt(idParam, 10) : NaN;
    if (idParam && !isNaN(numId)) {
      this.roleId.set(numId);
      this.isEdit.set(true);
    }
    this.loadPermissions();
  }

  private loadPermissions(): void {
    this.roleService.getPlatformPermissions().subscribe({
      next: (items) => {
        const groups = groupPermissionsFromBackend(items);
        this.permissionsByModule.set(groups);
        const id = this.roleId();
        if (id !== null) this.loadRole(id, groups);
      },
      error: (err) => this.error.set(err?.message ?? 'Error al cargar permisos'),
    });
  }

  private loadRole(id: number, groups: PermissionGroup[]): void {
    this.loading.set(true);
    this.error.set(null);
    const allPermissionValues = groups.flatMap((g) => g.permissions.map((p) => p.value));
    this.roleService
      .getRole(id)
      .pipe(
        switchMap((role) => {
          this.form.patchValue({
            roleCode: role.roleCode,
            roleName: role.roleName,
            description: role.description ?? '',
          });
          return this.roleService.getRolePermissions(id);
        })
      )
      .subscribe({
        next: (perms) => {
          this.selectedPermissions.set(
            expandRolePermissions(perms, allPermissionValues)
          );
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al cargar rol o permisos');
          this.loading.set(false);
        },
      });
  }

  isPermissionChecked(value: string): boolean {
    return this.selectedPermissions().has(value);
  }

  togglePermission(value: string): void {
    const next = new Set(this.selectedPermissions());
    if (next.has(value)) next.delete(value);
    else next.add(value);
    this.selectedPermissions.set(next);
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const id = this.roleId();
    const permissions = Array.from(this.selectedPermissions());

    const handleError = (err: unknown): void => {
      this.loading.set(false);
      if (err instanceof HttpErrorResponse && err.status === 501) {
        this.error.set(CONFIG_DRIVEN_ROLES_MESSAGE);
        return;
      }
      const msg =
        err instanceof HttpErrorResponse
          ? (err.error?.error as string) || err.message
          : (err as Error)?.message;
      this.error.set(msg ?? 'Error al guardar');
    };

    if (id !== null) {
      const data: UpdateRoleDto = this.form.getRawValue();
      this.roleService.updateRole(id, data).subscribe({
        next: () => {
          this.roleService.updateRolePermissions(id, permissions).subscribe({
            next: () => {
              this.loading.set(false);
              void this.router.navigate([this.paths.usersRoles()]);
            },
            error: handleError,
          });
        },
        error: handleError,
      });
    } else {
      const data: CreateRoleDto = this.form.getRawValue();
      this.roleService.createRole(data).subscribe({
        next: (role) => {
          this.roleService.updateRolePermissions(role.roleId, permissions).subscribe({
            next: () => {
              this.loading.set(false);
              void this.router.navigate([this.paths.usersRoles()]);
            },
            error: handleError,
          });
        },
        error: handleError,
      });
    }
  }
}

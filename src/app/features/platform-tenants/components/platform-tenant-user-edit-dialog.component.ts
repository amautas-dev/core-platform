import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { FormsModule } from '@angular/forms';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { TenantService } from '../services/tenant.service';
import type { TenantUser } from '../models/tenant-user.interface';
import type { TenantRoleOption } from '../models/tenant-role-option.interface';

export interface PlatformTenantUserEditDialogData {
  tenantId: number;
  user: TenantUser;
  roles: TenantRoleOption[];
}

@Component({
  selector: 'app-platform-tenant-user-edit-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './platform-tenant-user-edit-dialog.component.html',
  styleUrls: ['./platform-tenant-user-edit-dialog.component.scss'],
})
export class PlatformTenantUserEditDialogComponent {
  private readonly ref = inject(MatDialogRef<PlatformTenantUserEditDialogComponent, boolean>);
  private readonly tenantService = inject(TenantService);
  private readonly translate = inject(TranslateService);
  readonly data = inject<PlatformTenantUserEditDialogData>(MAT_DIALOG_DATA);

  protected username = this.data.user.username ?? '';
  protected email = this.data.user.email ?? '';
  protected firstName = this.data.user.firstName ?? '';
  protected roleId = this.data.user.roleId != null ? String(this.data.user.roleId) : '';

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);

  protected cancel(): void {
    this.ref.close(false);
  }

  protected save(): void {
    const username = this.username.trim();
    const email = this.email.trim();
    const roleId = this.roleId.trim();
    if (!username || !email || !roleId) {
      this.errorMessage.set(this.translate.instant('tenants.tenantUserEditRequired'));
      return;
    }
    this.errorMessage.set(null);
    this.saving.set(true);
    const { tenantId, user } = this.data;
    this.tenantService
      .patchTenantUser(tenantId, user.userId, {
        username,
        email,
        firstName: this.firstName.trim() || undefined,
        roleId,
      })
      .subscribe({
        next: () => this.ref.close(true),
        error: (err) => {
          const code = err?.error?.error;
          let msg: string;
          if (code === 'email_or_username_already_in_use') {
            msg = this.translate.instant('tenants.tenantUserEmailInUse');
          } else if (code === 'username_required') {
            msg = this.translate.instant('tenants.tenantUserUsernameRequired');
          } else if (typeof code === 'string' && code.trim() && code !== 'Failed to update user') {
            msg = code;
          } else if (err?.message) {
            msg = err.message;
          } else {
            msg = this.translate.instant('tenants.tenantUserEditError');
          }
          this.errorMessage.set(msg);
          this.saving.set(false);
        },
      });
  }
}

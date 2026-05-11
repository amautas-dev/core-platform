import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { TenantService } from '../services/tenant.service';
import type { TenantUser } from '../models/tenant-user.interface';

export interface PlatformTenantUserPasswordDialogData {
  tenantId: number;
  user: TenantUser;
}

@Component({
  selector: 'app-platform-tenant-user-password-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './platform-tenant-user-password-dialog.component.html',
  styleUrls: ['./platform-tenant-user-password-dialog.component.scss'],
})
export class PlatformTenantUserPasswordDialogComponent {
  private readonly ref = inject(MatDialogRef<PlatformTenantUserPasswordDialogComponent>);
  private readonly tenantService = inject(TenantService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  readonly data = inject<PlatformTenantUserPasswordDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  /** Mensaje ya traducido o texto de API. */
  readonly errorMessage = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  });

  cancel(): void {
    this.ref.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.errorMessage.set(this.translate.instant('tenants.passwordMismatch'));
      return;
    }
    this.errorMessage.set(null);
    this.saving.set(true);
    const { tenantId, user } = this.data;
    this.tenantService.patchTenantUser(tenantId, user.userId, { password: newPassword }).subscribe({
      next: () => this.ref.close(true),
      error: (err) => {
        const raw = err?.error?.error ?? err?.message;
        this.errorMessage.set(
          typeof raw === 'string' && raw.trim()
            ? raw
            : this.translate.instant('tenants.setPasswordError'),
        );
        this.saving.set(false);
      },
    });
  }
}

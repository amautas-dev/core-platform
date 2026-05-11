import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TenantService, TenantI18nOverrideRow } from '../services/tenant.service';

export interface PlatformTenantI18nOverrideDialogData {
  tenantId: number;
  /** Si existe, modo edición (solo texto). */
  existing: TenantI18nOverrideRow | null;
}

@Component({
  selector: 'app-platform-tenant-i18n-override-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    TranslateModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './platform-tenant-i18n-override-dialog.component.html',
  styleUrls: ['./platform-tenant-i18n-override-dialog.component.scss'],
})
export class PlatformTenantI18nOverrideDialogComponent {
  private readonly ref = inject(MatDialogRef<PlatformTenantI18nOverrideDialogComponent>);
  readonly data = inject<PlatformTenantI18nOverrideDialogData>(MAT_DIALOG_DATA);
  private readonly tenantService = inject(TenantService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly apiError = signal<string | null>(null);

  readonly isEdit = !!this.data.existing;

  readonly form = this.fb.nonNullable.group({
    labelKey: [
      { value: this.data.existing?.labelKey ?? '', disabled: this.isEdit },
      [Validators.required],
    ],
    lang: [{ value: this.data.existing?.lang ?? 'es', disabled: this.isEdit }, [Validators.required]],
    text: [this.data.existing?.text ?? '', [Validators.required]],
  });

  cancel(): void {
    this.ref.close();
  }

  submit(): void {
    this.apiError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const tid = this.data.tenantId;
    this.saving.set(true);
    if (this.isEdit && this.data.existing) {
      this.tenantService
        .updateTenantI18nOverride(tid, this.data.existing.id, { text: this.form.controls.text.value })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.ref.close(true);
          },
          error: (err) => {
            this.saving.set(false);
            this.apiError.set(err?.error?.error ?? err?.message ?? 'Error');
          },
        });
    } else {
      this.tenantService
        .createTenantI18nOverride(tid, {
          labelKey: this.form.controls.labelKey.value.trim(),
          lang: this.form.controls.lang.value.trim(),
          text: this.form.controls.text.value,
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.ref.close(true);
          },
          error: (err) => {
            this.saving.set(false);
            this.apiError.set(err?.error?.error ?? err?.message ?? 'Error');
          },
        });
    }
  }
}

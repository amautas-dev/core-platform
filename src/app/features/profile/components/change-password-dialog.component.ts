import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { ProfileService } from '../services/profile.service';

@Component({
  selector: 'app-change-password-dialog',
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
  templateUrl: './change-password-dialog.component.html',
  styleUrls: ['./change-password-dialog.component.scss'],
})
export class ChangePasswordDialogComponent {
  private readonly ref = inject(MatDialogRef<ChangePasswordDialogComponent>);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
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
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (newPassword !== confirmPassword) {
      this.error.set('profile.passwordsDoNotMatch');
      return;
    }
    this.error.set(null);
    this.saving.set(true);
    this.profileService.changePassword(currentPassword, newPassword).subscribe({
      next: () => this.ref.close(true),
      error: (err) => {
        this.error.set(err?.error?.error ?? err?.message ?? 'profile.changePasswordError');
        this.saving.set(false);
      },
    });
  }
}

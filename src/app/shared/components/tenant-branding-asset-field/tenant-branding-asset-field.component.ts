import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';
import { TenantService } from '../../../features/platform-tenants/services/tenant.service';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';

export type TenantBrandingAssetUploadType = 'logo' | 'logo_dark' | 'favicon' | 'login_background';

@Component({
  selector: 'app-tenant-branding-asset-field',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './tenant-branding-asset-field.component.html',
  styleUrls: ['./tenant-branding-asset-field.component.scss'],
})
export class TenantBrandingAssetFieldComponent implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  /** Control con la URL final (subida o manual). */
  @Input({ required: true }) control!: FormControl<string>;

  /** Clave i18n del título (ej. tenants.brandingAssetLogo). */
  @Input({ required: true }) labelKey!: string;

  /** Clave i18n con recomendaciones de tamaño/formato. */
  @Input({ required: true }) hintKey!: string;

  @Input({ required: true }) tenantId!: number;

  @Input({ required: true }) uploadType!: TenantBrandingAssetUploadType;

  /** Desactiva arrastre y botones (solo lectura). */
  @Input() disabled = false;

  readonly uploading = signal(false);
  readonly dragOver = signal(false);
  readonly previewError = signal(false);

  readonly maxBytes = 6 * 1024 * 1024;

  ngOnInit(): void {
    this.control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.previewError.set(false);
    });
  }

  onPickFile(fileList: FileList | null): void {
    const file = fileList?.[0];
    if (!file) return;
    this.tryUpload(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
    if (this.disabled) return;
    const file = event.dataTransfer?.files?.[0];
    if (file) this.tryUpload(file);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.disabled) this.dragOver.set(true);
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOver.set(false);
  }

  clear(): void {
    if (this.disabled) return;
    this.control.setValue('');
    this.previewError.set(false);
  }

  private tryUpload(file: File): void {
    if (this.disabled) return;
    if (!file.type.startsWith('image/')) {
      this.snackBar.open(this.translate.instant('tenants.brandingNotImage'), this.translate.instant('common.close'), {
        duration: 5000,
      });
      return;
    }
    if (file.size > this.maxBytes) {
      this.snackBar.open(this.translate.instant('tenants.brandingFileTooLarge'), this.translate.instant('common.close'), {
        duration: 6000,
      });
      return;
    }
    this.uploading.set(true);
    this.previewError.set(false);
    this.tenantService.uploadTenantThemeAsset(this.tenantId, file, this.uploadType).subscribe({
      next: (res) => {
        this.control.setValue(res.publicUrl);
        this.uploading.set(false);
      },
      error: () => {
        this.uploading.set(false);
        this.snackBar.open(this.translate.instant('tenants.brandingUploadError'), this.translate.instant('common.close'), {
          duration: 6000,
        });
      },
    });
  }
}

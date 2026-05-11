import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, finalize } from 'rxjs';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-branding-asset-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './branding-asset-upload.component.html',
  styleUrls: ['./branding-asset-upload.component.scss'],
})
export class BrandingAssetUploadComponent implements OnChanges {
  @Input({ required: true }) label = '';
  /** URL efectiva para la vista previa (absoluta o relativa). */
  @Input() previewUrl: string | null = null;
  @Input() inherited = false;
  @Input() inheritedLabelKey = 'settings.branding.inheritedFromPlatform';
  /**
   * Imagen local si no hay previewUrl o falla la carga.
   * `undefined` (omitido) = logo Amautas por defecto.
   * `null` = sin imagen de marca: placeholder neutro (p. ej. fondos de login; evita mostrar un logo en un slot de fondo).
   */
  @Input() fallbackSrc: string | null | undefined = undefined;
  @Input() compactPreview = false;
  @Input() faviconPreview = false;
  @Input() disabled = false;
  /** Muestra «Volver a heredar» (tenant con override propio). */
  @Input() showRevertToInherit = false;
  /** Muestra eliminar (hay asset propio o archivo subido). */
  @Input() showRemove = false;
  /**
   * Subida: devuelve Observable con `{ id }` (fileId). Si es null, el botón Subir queda deshabilitado.
   */
  @Input() uploadHandler: ((file: File) => Observable<{ id: string }>) | null = null;

  @Output() uploaded = new EventEmitter<{ id: string }>();
  @Output() cleared = new EventEmitter<void>();
  @Output() revertInherit = new EventEmitter<void>();

  readonly uploading = signal(false);
  /** Si la URL de vista previa falla (404, MIME, etc.), mostramos fallback en lugar de un recuadro vacío. */
  readonly previewLoadFailed = signal(false);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['previewUrl']) {
      this.previewLoadFailed.set(false);
    }
  }

  onPreviewImageError(): void {
    this.previewLoadFailed.set(true);
  }

  onFileInput(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.disabled) return;
    if (!file.type.startsWith('image/')) return;
    const handler = this.uploadHandler;
    if (!handler) return;
    this.uploading.set(true);
    handler(file)
      .pipe(finalize(() => this.uploading.set(false)))
      .subscribe({
        next: (res) => this.uploaded.emit(res),
        error: () => {
          /* snackbar en el padre si hace falta */
        },
      });
  }

  displayUrl(): string | null {
    const u = this.previewUrl?.trim();
    if (u) return u;
    return null;
  }

  /** `null` en @Input fallbackSrc → no usar logo Amautas en slots de fondo / patrón. */
  effectiveFallbackImg(): string | null {
    if (this.fallbackSrc === null) return null;
    const s = (this.fallbackSrc ?? 'assets/brand/amautas-logo.png').trim();
    return s || 'assets/brand/amautas-logo.png';
  }
}

import { Pipe, PipeTransform, inject, ChangeDetectorRef, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { getDisplayValue } from './translate-missing.helper';
import { DbTranslationsLoaderService } from './db-translations.loader';

/**
 * Pipe único para traducciones: siempre usa TranslateService (BD fusionada con estáticos).
 * Se actualiza al cambiar idioma y cuando se cargan/fusionan traducciones desde BD.
 */
@Pipe({
  name: 'translate',
  standalone: true,
  pure: false,
})
export class PlatformTranslatePipe implements PipeTransform {
  private readonly translate = inject(TranslateService);
  private readonly ref = inject(ChangeDetectorRef);
  private readonly dbLoader = inject(DbTranslationsLoaderService, { optional: true });

  constructor() {
    this.translate.onLangChange?.subscribe(() => this.ref.markForCheck());
    this.translate.onTranslationChange?.subscribe(() => this.ref.markForCheck());
    this.dbLoader?.dbTranslationsLoaded$.subscribe(() => this.ref.markForCheck());
  }

  transform(key: string | null | undefined, interpolateParams?: Record<string, unknown>): string {
    if (key == null || key === '') return '';
    const value = this.translate.instant(key, interpolateParams) || key;
    const lang = this.translate.currentLang || 'es';
    return getDisplayValue(lang, key, !isDevMode(), value);
  }
}

/** Alias for use in component imports (same pipe, unique class name). */
export const TranslatePipe = PlatformTranslatePipe;

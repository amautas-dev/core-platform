import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { getDisplayValue } from './translate-missing.helper';

export type LocaleId = 'es' | 'en';

/**
 * Legacy i18n service: delegates to ngx-translate (TranslateService).
 * Language is managed by LanguageService + localStorage; this service remains for API compatibility.
 * In development, missing keys log a console warning and return ??key??.
 */
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly translateService = inject(TranslateService);

  /** Current locale (from ngx-translate). */
  readonly currentLang = signal<LocaleId>((this.translateService.currentLang as LocaleId) || 'es');

  /** Available locales for the language selector. */
  readonly availableLocales: { id: LocaleId; labelKey: string }[] = [
    { id: 'es', labelKey: 'language.es' },
    { id: 'en', labelKey: 'language.en' },
  ];

  constructor() {
    this.translateService.onLangChange?.subscribe((e) => {
      this.currentLang.set((e.lang as LocaleId) || 'es');
    });
  }

  setLanguage(locale: LocaleId): void {
    this.translateService.use(locale);
    this.currentLang.set(locale);
  }

  /** Translate a key using ngx-translate. Missing keys in dev log a warning and return ??key??. */
  translate(key: string): string {
    const value = this.translateService.instant(key) || key;
    const lang = this.translateService.currentLang || 'es';
    return getDisplayValue(lang, key, !isDevMode(), value);
  }

  getEffectiveLocale(): LocaleId {
    return (this.translateService.currentLang as LocaleId) || 'es';
  }
}

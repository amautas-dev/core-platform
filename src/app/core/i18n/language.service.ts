import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { DbTranslationsLoaderService } from './db-translations.loader';
import { translateUrlPath } from '../routing/route-url-translate';

export type SupportedLang = 'es' | 'en';

const STORAGE_KEY = 'platform-admin.locale';
const DEFAULT_LANG: SupportedLang = 'es';
const SUPPORTED_LANGS: SupportedLang[] = ['es', 'en'];

/**
 * Language service for Platform Admin.
 * - Uses ngx-translate (TranslateService).
 * - Persists selected language in localStorage.
 * - Al cambiar idioma re-aplica traducciones de BD para que el menú y toda la UI usen valores de BD.
 */
@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly translate = inject(TranslateService);
  private readonly dbLoader = inject(DbTranslationsLoaderService);
  private readonly router = inject(Router);

  /** Se incrementa al cambiar idioma para recomputar rutas localizadas en la UI. */
  readonly localeVersion = signal(0);

  /** Supported language codes. */
  readonly supportedLangs = SUPPORTED_LANGS;

  /** Current language (from TranslateService). */
  get currentLang(): SupportedLang {
    const current = this.translate.currentLang as SupportedLang;
    return SUPPORTED_LANGS.includes(current) ? current : DEFAULT_LANG;
  }

  /** Label for display: "Español" | "English". */
  get currentLangLabel(): string {
    return this.currentLang === 'es' ? 'Español' : 'English';
  }

  /** Set language and persist to localStorage. Re-aplica traducciones de BD para que menú y UI usen valores de BD. */
  setLanguage(lang: SupportedLang): void {
    if (!SUPPORTED_LANGS.includes(lang)) return;
    const url = this.router.url;
    const path = url.split('?')[0] ?? '';
    const qs = url.includes('?') ? '?' + url.split('?')[1] : '';
    const newPath = translateUrlPath(path, lang);
    this.translate.use(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, lang);
    }
    this.localeVersion.update((v) => v + 1);
    this.dbLoader.loadFromDb().subscribe();
    if (newPath !== path) {
      void this.router.navigateByUrl(newPath + qs, { replaceUrl: true });
    }
  }

  /**
   * Load saved language on app startup. Call from APP_INITIALIZER.
   * Returns a Promise that resolves when the language is loaded.
   */
  loadSavedLanguage(): Promise<void> {
    let lang: SupportedLang = DEFAULT_LANG;
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY) as SupportedLang | null;
      if (stored === 'es' || stored === 'en') lang = stored;
    }
    this.translate.setDefaultLang(DEFAULT_LANG);
    return this.translate
      .use(lang)
      .toPromise()
      .then(() => {
        this.localeVersion.update((v) => v + 1);
        return undefined;
      });
  }
}

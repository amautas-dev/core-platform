import { TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { es } from './translations/es';
import { en } from './translations/en';

const MAP: Record<string, Record<string, unknown>> = {
  es: es as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

/**
 * Loads translations from the existing TS translation objects (no HTTP).
 * Used by ngx-translate so we keep a single source of truth.
 */
export class PlatformTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<Record<string, unknown>> {
    const dict = MAP[lang] ?? MAP['es'];
    return of(dict);
  }
}

export function createPlatformTranslateLoader(): PlatformTranslateLoader {
  return new PlatformTranslateLoader();
}

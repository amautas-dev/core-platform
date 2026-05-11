import { ApplicationRef, Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ApiService } from '../api/api.service';
import { forkJoin, of, Observable, Subject } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

const I18N_BASE = 'v1/platform/i18n';
const LANGS = ['es', 'en'] as const;

/**
 * Cómo funcionan las traducciones en esta app:
 *
 * 1) es.ts / en.ts (y es.js, en.js en la API)
 *    - Son la fuente de claves y valores por defecto.
 *    - Se cargan al arranque de la app como fallback en ngx-translate.
 *    - El script seed-i18n-labels.js los usa para insertar labels y traducciones nuevas en la BD
 *      (sin pisar las que ya existen).
 *
 * 2) Base de datos (i18n_label, i18n_translation)
 *    - Es la fuente de verdad en runtime: lo que editas en Traducciones se guarda ahí.
 *    - Tras login (y al cargar el shell), este servicio pide GET /translations/:lang y fusiona
 *      los resultados en TranslateService, sobrescribiendo los valores estáticos.
 *    - Por tanto, lo que se muestra en la app viene de la BD cuando hay valor; si no, del .ts.
 *
 * 3) Después de editar una traducción en el diálogo, se llama loadFromDb() para recargar
 *    desde la API y actualizar TranslateService, así la página refleja el cambio al instante.
 */

/**
 * Convierte un objeto plano { 'menu.tenants': 'Empresas' } en anidado { menu: { tenants: 'Empresas' } }
 * para que ngx-translate pueda usarlo con instant('menu.tenants').
 */
function flatToNested(flat: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (!(p in current) || typeof current[p] !== 'object') {
        current[p] = {};
      }
      current = current[p] as Record<string, unknown>;
    }
    current[parts[parts.length - 1]] = value;
  }
  return result;
}

/**
 * Carga las traducciones desde la BD (API) y las fusiona en TranslateService.
 * Las claves que existan en la BD sobrescriben las estáticas (es.ts / en.ts).
 * Llamar después del login y al cargar el shell para que toda la app use valores de BD.
 */
@Injectable({ providedIn: 'root' })
export class DbTranslationsLoaderService {
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);
  private readonly appRef = inject(ApplicationRef);

  /** Emite cuando se fusionaron traducciones de BD; el pipe translate se suscribe para actualizar la UI. */
  private readonly _dbTranslationsLoaded = new Subject<void>();
  readonly dbTranslationsLoaded$ = this._dbTranslationsLoaded.asObservable();

  /**
   * Obtiene las traducciones planas de la API y las fusiona en el servicio de traducción.
   * Retorna un Observable que completa cuando terminó (para poder await después del login).
   * Si la API falla (ej. sin auth), no se modifica nada y el Observable completa igual.
   */
  loadFromDb(): Observable<void> {
    return forkJoin(
      LANGS.map((lang) =>
        this.api.get<Record<string, string>>(`${I18N_BASE}/translations/${lang}`).pipe(
          catchError(() => of({})),
          tap((flat) => {
            const nested = flatToNested(flat);
            if (Object.keys(nested).length > 0) {
              this.translate.setTranslation(lang, nested, true);
            }
          })
        )
      )
    ).pipe(
      map(() => undefined),
      tap(() => {
        const current = this.translate.currentLang || 'es';
        this.translate.use(current);
        this._dbTranslationsLoaded.next();
        this.appRef.tick();
        setTimeout(() => this.appRef.tick(), 0);
      })
    );
  }
}

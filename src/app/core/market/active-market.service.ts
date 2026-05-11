import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { LanguageService } from '../i18n/language.service';

const STORAGE_KEY = 'amautas.platform.catalogCountry';
export const DEFAULT_MARKET_COUNTRY = 'AR';

/** Segmentos de primer nivel del catálogo (en cualquier idioma de URL). */
const CATALOG_ROOT_SEGMENTS = new Set(['catalog', 'catalogo']);

export function isCatalogPath(pathOnly: string): boolean {
  const p = pathOnly.split('?')[0].replace(/^\/+|\/+$/g, '');
  const first = p.split('/').filter(Boolean)[0]?.toLowerCase();
  return first != null && CATALOG_ROOT_SEGMENTS.has(first);
}

function flagEmojiFromCode(cc: string): string {
  const c = cc.toUpperCase();
  if (!/^[A-Z]{2}$/.test(c)) return '';
  const cp = (ch: string) => 0x1f1e6 + (ch.charCodeAt(0) - 65);
  return String.fromCodePoint(cp(c[0]), cp(c[1]));
}

function regionDisplayName(cc: string, lang: string): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(cc.toUpperCase()) ?? cc;
  } catch {
    return cc;
  }
}

/**
 * Moneda de referencia habitual por mercado (solo UI / hints; el plan guarda la moneda que devuelve la API).
 */
export function defaultCurrencyForCountry(countryCode: string): string {
  const c = String(countryCode ?? '')
    .trim()
    .toUpperCase()
    .slice(0, 2);
  const map: Record<string, string> = {
    AR: 'ARS',
    ES: 'EUR',
    US: 'USD',
    MX: 'MXN',
    CO: 'COP',
    PE: 'PEN',
    CL: 'CLP',
    UY: 'UYU',
  };
  return map[c] ?? 'USD';
}

@Injectable({ providedIn: 'root' })
export class ActiveMarketService {
  private readonly router = inject(Router);
  private readonly language = inject(LanguageService);

  private _syncing = false;

  /** ISO 3166-1 alpha-2; sincronizado con `?country=` en rutas de catálogo y sessionStorage. */
  readonly countryCode = signal<string>(DEFAULT_MARKET_COUNTRY);

  readonly flagEmoji = computed(() => flagEmojiFromCode(this.countryCode()));

  readonly regionName = computed(() => {
    this.language.localeVersion();
    const lang = this.language.currentLang === 'en' ? 'en' : 'es';
    return regionDisplayName(this.countryCode(), lang);
  });

  /** Selector del header: mismos mercados habituales + el país activo si no está en la lista. */
  readonly countrySelectOptions = computed(() => {
    const cur = this.countryCode();
    const base = ['AR', 'CO', 'ES', 'MX', 'US'];
    const set = new Set<string>([...base, cur]);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  });

  init(): void {
    this.syncFromUrl(this.router.url);
    this.router.events.pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd)).subscribe(() => {
      this.syncFromUrl(this.router.url);
    });
  }

  private normalize(raw: string | null | undefined): string {
    if (raw == null || String(raw).trim() === '') return DEFAULT_MARKET_COUNTRY;
    const cc = String(raw).trim().toUpperCase().slice(0, 2);
    return /^[A-Z]{2}$/.test(cc) ? cc : DEFAULT_MARKET_COUNTRY;
  }

  private syncFromUrl(fullUrl: string): void {
    if (this._syncing) return;
    const tree = this.router.parseUrl(fullUrl);
    const pathOnly = fullUrl.split('?')[0];
    const rawQ = tree.queryParams['country'];

    if (rawQ != null && /^[a-zA-Z]{2}$/.test(String(rawQ))) {
      const cc = String(rawQ).toUpperCase().slice(0, 2);
      this.countryCode.set(cc);
      try {
        sessionStorage.setItem(STORAGE_KEY, cc);
      } catch {
        /* ignore */
      }
      return;
    }

    if (isCatalogPath(pathOnly)) {
      let cc = DEFAULT_MARKET_COUNTRY;
      try {
        cc = sessionStorage.getItem(STORAGE_KEY) ?? DEFAULT_MARKET_COUNTRY;
      } catch {
        /* ignore */
      }
      cc = this.normalize(cc);
      this.countryCode.set(cc);
      this._syncing = true;
      tree.queryParams = { ...tree.queryParams, country: cc };
      void this.router.navigateByUrl(tree, { replaceUrl: true }).finally(() => {
        this._syncing = false;
      });
      return;
    }

    let fallback = DEFAULT_MARKET_COUNTRY;
    try {
      fallback = sessionStorage.getItem(STORAGE_KEY) ?? DEFAULT_MARKET_COUNTRY;
    } catch {
      /* ignore */
    }
    this.countryCode.set(this.normalize(fallback));
  }

  /** Cambia mercado; en catálogo actualiza `?country=` sin perder el resto de query params. */
  setCountry(code: string): void {
    const cc = this.normalize(code);
    try {
      sessionStorage.setItem(STORAGE_KEY, cc);
    } catch {
      /* ignore */
    }
    this.countryCode.set(cc);
    const pathOnly = this.router.url.split('?')[0];
    if (!isCatalogPath(pathOnly)) {
      return;
    }
    const tree = this.router.parseUrl(this.router.url);
    tree.queryParams = { ...tree.queryParams, country: cc };
    this._syncing = true;
    void this.router.navigateByUrl(tree, { replaceUrl: true }).finally(() => {
      this._syncing = false;
    });
  }

  /** Para `routerLink` explícito (opcional; el servicio también rellena `country` al entrar al catálogo). */
  catalogQueryParams(): { country: string } {
    return { country: this.countryCode() };
  }
}

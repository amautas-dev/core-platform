import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../core/auth/auth.service';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { applyDocumentTheme } from '../../../core/theming/theme-document-applier';
import type { BrandingColorInput } from '../../../core/theming/branding.types';
import { parsePartialThemeTokensFromApi } from '../../../core/theming/theme-token-merge';
import type { PartialThemeTokens } from '../../../core/theming/theme-token-merge';

const BASE = 'v1/platform/settings';
const BRANDING_CACHE_KEY = 'platformAdmin.branding.v1';

function parseThemeModeDefault(
  v: unknown,
): 'light' | 'dark' | 'system' | undefined {
  if (v == null || v === '') return undefined;
  const s = String(v).toLowerCase();
  if (s === 'light' || s === 'dark' || s === 'system') return s;
  return undefined;
}

/** Campos de branding + overrides de tokens CSS (misma forma que {@link BrandingColorInput}). */
export type BrandingColors = BrandingColorInput;

export interface PlatformSettingsDto {
  id: string;
  logoFileId: string | null;
  logoDarkFileId?: string | null;
  logoCompactFileId?: string | null;
  logoCompactDarkFileId?: string | null;
  faviconFileId: string | null;
  loginBackgroundLightFileId?: string | null;
  loginBackgroundDarkFileId?: string | null;
  appBackgroundPatternFileId?: string | null;
  loginBackgroundUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  /** Canonical acento de marca (API; fallback a secondary si null en BD). */
  accentColor?: string;
  sidebarBgColor: string;
  headerBgColor: string;
  /** Fondo del lienzo (body), distinto de la barra superior. */
  pageBackgroundColor?: string | null;
  buttonPrimaryColor: string;
  buttonSecondaryColor: string;
  /** Texto de botones tipo Cancelar / Volver (`mat-button` sin color). */
  buttonCancelColor?: string | null;
  textColor: string;
  fontFamily: string | null;
  defaultLanguageCode: string;
  availableLanguageCodes: string[] | null;
  dateFormat: string;
  currency: string;
  timezone: string;
  createdAt?: string;
  updatedAt?: string;
  /** Overrides de paleta (escalas + functional). */
  themeTokenOverrides?: PartialThemeTokens | null;
  darkThemeTokenOverrides?: PartialThemeTokens | null;
  themeModeDefault?: 'light' | 'dark' | 'system' | null;
  /** Resolución con URLs de assets (GET con Request). */
  brandingResolved?: unknown;
}

export interface PlatformLanguageDto {
  id: string;
  code: string;
  name: string;
  nativeName: string | null;
  isDefault: boolean;
  sortOrder: number | null;
}

@Injectable({ providedIn: 'root' })
export class PlatformSettingsService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  /** IDs para logo barra lateral (sincronizados en {@link applyBrandingToDocument}). */
  private readonly shellLogoFileId = signal<string | null>(null);
  private readonly shellLogoCompactFileId = signal<string | null>(null);
  private readonly shellLogoCacheBust = signal(0);

  /**
   * `<img>` del sidebar expandido: logo principal; fallback estático si no hay id.
   */
  readonly shellSidebarLogoExpandedSrc = computed(() => {
    const u = this.platformAssetUrlByFileId(this.shellLogoFileId());
    if (!u) return null;
    return `${u}?t=${this.shellLogoCacheBust()}`;
  });

  /**
   * Sidebar colapsado: logo compacto, o el principal si no hay compacto.
   */
  readonly shellSidebarLogoCollapsedSrc = computed(() => {
    const compact = this.shellLogoCompactFileId();
    const full = this.shellLogoFileId();
    const u = this.platformAssetUrlByFileId(compact) ?? this.platformAssetUrlByFileId(full);
    if (!u) return null;
    return `${u}?t=${this.shellLogoCacheBust()}`;
  });

  private syncShellLogoAssetsFromDto(
    dto: Partial<PlatformSettingsDto> | Partial<BrandingColors> | null,
  ): void {
    if (!dto || typeof dto !== 'object') return;
    let changed = false;
    if ('logoFileId' in dto) {
      this.shellLogoFileId.set((dto as Partial<PlatformSettingsDto>).logoFileId ?? null);
      changed = true;
    }
    if ('logoCompactFileId' in dto) {
      this.shellLogoCompactFileId.set((dto as Partial<PlatformSettingsDto>).logoCompactFileId ?? null);
      changed = true;
    }
    if (changed) this.shellLogoCacheBust.update((n) => n + 1);
  }

  private faviconHrefCacheBust = 0;

  /**
   * Pestaña del navegador: `<link rel="icon">` no se actualiza solo; hay que asignar `href`
   * a la ruta pública del archivo subido (misma que la vista previa).
   */
  private syncDocumentFaviconFromDto(
    dto: Partial<PlatformSettingsDto> | Partial<BrandingColors> | null,
  ): void {
    if (!dto || typeof dto !== 'object' || !('faviconFileId' in dto)) return;
    const id = (dto as Partial<PlatformSettingsDto>).faviconFileId;
    const defaultStatic = 'assets/brand/amautas-logo-reduc.png';
    const href =
      id != null && String(id).trim() !== ''
        ? `${this.platformAssetUrlByFileId(String(id))}?t=${++this.faviconHrefCacheBust}`
        : defaultStatic;

    const ensure = (rel: string): HTMLLinkElement => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) {
        el = document.createElement('link');
        el.rel = rel;
        document.head.appendChild(el);
      }
      return el;
    };

    for (const rel of ['icon', 'shortcut icon'] as const) {
      const link = ensure(rel);
      link.href = href;
      link.removeAttribute('type');
    }
    const apple = ensure('apple-touch-icon');
    apple.href = href;
  }

  getSettings(): Observable<PlatformSettingsDto> {
    return this.api.get<PlatformSettingsDto>(BASE);
  }

  updateSettings(body: Partial<PlatformSettingsDto>): Observable<PlatformSettingsDto> {
    return this.api.put<PlatformSettingsDto>(BASE, body);
  }

  getLanguages(): Observable<PlatformLanguageDto[]> {
    return this.api.get<PlatformLanguageDto[]>(`${BASE}/languages`);
  }

  /** Upload logo or favicon; returns { id, storagePath }. Use id as logoFileId/faviconFileId when saving. */
  uploadAsset(
    file: File,
    type:
      | 'logo'
      | 'logo_dark'
      | 'logo_compact'
      | 'logo_compact_dark'
      | 'favicon'
      | 'login_background_light'
      | 'login_background_dark'
      | 'app_background_pattern',
  ): Observable<{ id: string; storagePath: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const url = this.api.buildUrl(`${BASE}/upload`);
    const token = this.auth.getToken();
    const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : undefined;
    return this.http.post<{ id: string; storagePath: string }>(url, form, { headers });
  }

  /** URL to display current logo image (streamed by API). */
  logoAssetUrl(): string {
    return this.api.buildUrl(`${BASE}/assets/logo`);
  }

  /** URL to display current favicon image. */
  faviconAssetUrl(): string {
    return this.api.buildUrl(`${BASE}/assets/favicon`);
  }

  /**
   * Ruta **relativa al origen** (`/api/v1/...`) para `<img>` y JSON portable entre servidores.
   * En `ng serve`, usar `proxy.conf.json` para reenviar `/api` al backend.
   */
  platformAssetUrlByFileId(fileId: string | null | undefined): string | null {
    if (!fileId) return null;
    return this.api.buildUrl(`v1/public/platform-branding-asset/${encodeURIComponent(String(fileId))}`);
  }

  restorePlatformDocumentFavicon(): void {
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<PlatformSettingsDto>;
        this.syncDocumentFaviconFromDto(parsed);
        return;
      }
    } catch {
      // ignore invalid cache
    }
    this.syncDocumentFaviconFromDto({ faviconFileId: null });
  }

  /**
   * Genera la paleta desde los inputs, aplica variables `--color-*` semánticas y puente Material.
   */
  applyBrandingToDocument(dto: Partial<PlatformSettingsDto> | Partial<BrandingColors> | null): void {
    if (!dto) return;

    this.syncShellLogoAssetsFromDto(dto);
    this.syncDocumentFaviconFromDto(dto);

    const parsed = parsePartialThemeTokensFromApi(dto.themeTokenOverrides as unknown);
    const normalized: Partial<BrandingColorInput> = {
      ...(dto as Partial<BrandingColorInput>),
      themeTokenOverrides: parsed ?? dto.themeTokenOverrides ?? null,
      themeModeDefault: parseThemeModeDefault(
        (dto as Partial<PlatformSettingsDto>).themeModeDefault,
      ),
    };

    applyDocumentTheme({
      dto: normalized,
    });

    const root = document.documentElement.style;
    const ff = normalized.fontFamily?.trim();
    if (ff) {
      document.body.style.setProperty('font-family', ff);
      root.setProperty('--theme-font-family', ff);
    } else {
      document.body.style.removeProperty('font-family');
      root.removeProperty('--theme-font-family');
    }

    this.persistBrandingCache(normalized);
  }

  applyBrandingFromCache(): void {
    try {
      const raw = localStorage.getItem(BRANDING_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<BrandingColors> | null;
      if (!parsed) return;
      this.applyBrandingToDocument(parsed);
    } catch {
      // ignore invalid cache
    }
  }

  private persistBrandingCache(dto: Partial<BrandingColors>): void {
    try {
      localStorage.setItem(BRANDING_CACHE_KEY, JSON.stringify(dto));
    } catch {
      // storage may be unavailable
    }
  }
}

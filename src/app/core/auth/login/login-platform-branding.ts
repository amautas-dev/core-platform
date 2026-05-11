/**
 * Aplica --theme-login-hero-url y --theme-logo-url desde la API pública (sin JWT).
 * Las URLs deben ser absolutas al host de la API (mismo `apiUrl` que HttpClient); si no,
 * `url(...)` en CSS resuelve mal contra :4201.
 */

export interface PlatformLoginBrandingDto {
  logoFileId: string | null;
  logoDarkFileId: string | null;
  logoCompactFileId: string | null;
  logoCompactDarkFileId: string | null;
  faviconFileId: string | null;
  loginBackgroundLightFileId: string | null;
  loginBackgroundDarkFileId: string | null;
  loginBackgroundUrl: string | null;
  /** Color de marca (hex) para acento en login sin imagen. */
  primaryColor: string | null;
  /** Color de página (hex) como fondo cuando no hay hero. */
  pageBackgroundColor: string | null;
}

/** Igual que `ApiService.buildUrl`: base `…/api` + path `v1/public/...`. */
export type BuildApiUrlFn = (path: string) => string;

export function platformPublicAssetUrl(fileId: string, buildApiUrl: BuildApiUrlFn): string {
  return buildApiUrl(`v1/public/platform-branding-asset/${encodeURIComponent(fileId)}`);
}

function escapeForCssUrl(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function setRootCssUrlVar(name: string, pathOrAbsoluteUrl: string): void {
  document.documentElement.style.setProperty(name, `url("${escapeForCssUrl(pathOrAbsoluteUrl)}")`);
}

/**
 * Evita seguir usando la portada empaquetada o rutas legacy a /assets/login/.
 */
function isLegacyBundledLoginBackground(url: string): boolean {
  const u = String(url).trim().toLowerCase();
  if (!u) return false;
  if (u.includes('portada.png') || u.includes('/assets/login/') || u.includes('assets\\login\\')) return true;
  if (u.startsWith('/') && u.includes('login') && u.endsWith('.png')) return true;
  return false;
}

export function resolveLoginHeroPath(dto: PlatformLoginBrandingDto, buildApiUrl: BuildApiUrlFn): string | null {
  const id = (v: string | null | undefined) => (v != null && String(v).trim() ? String(v).trim() : null);
  const lightId = id(dto.loginBackgroundLightFileId);
  const darkId = id(dto.loginBackgroundDarkFileId);
  const darkMode =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (darkMode && darkId) return platformPublicAssetUrl(darkId, buildApiUrl);
  if (lightId) return platformPublicAssetUrl(lightId, buildApiUrl);
  if (darkId) return platformPublicAssetUrl(darkId, buildApiUrl);

  const legacy = dto.loginBackgroundUrl?.trim();
  if (legacy && !isLegacyBundledLoginBackground(legacy)) {
    if (/^https?:\/\//i.test(legacy)) return legacy;
    if (legacy.startsWith('/api/')) {
      return buildApiUrl(legacy.replace(/^\/api\/?/, '').replace(/^\/+/, ''));
    }
    if (legacy.startsWith('/')) {
      return typeof window !== 'undefined' ? `${window.location.origin}${legacy}` : legacy;
    }
    return `/${legacy}`;
  }
  return null;
}

export function resolveLoginLogoPath(dto: PlatformLoginBrandingDto, buildApiUrl: BuildApiUrlFn): string | null {
  const id = (v: string | null | undefined) => (v != null && String(v).trim() ? String(v).trim() : null);
  const darkMode =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  const logoDark = id(dto.logoDarkFileId);
  const logoLight = id(dto.logoFileId);
  const compactDark = id(dto.logoCompactDarkFileId);
  const compactLight = id(dto.logoCompactFileId);

  if (darkMode) {
    if (logoDark) return platformPublicAssetUrl(logoDark, buildApiUrl);
    if (compactDark) return platformPublicAssetUrl(compactDark, buildApiUrl);
    if (logoLight) return platformPublicAssetUrl(logoLight, buildApiUrl);
    if (compactLight) return platformPublicAssetUrl(compactLight, buildApiUrl);
  } else {
    if (logoLight) return platformPublicAssetUrl(logoLight, buildApiUrl);
    if (compactLight) return platformPublicAssetUrl(compactLight, buildApiUrl);
    if (logoDark) return platformPublicAssetUrl(logoDark, buildApiUrl);
    if (compactDark) return platformPublicAssetUrl(compactDark, buildApiUrl);
  }
  return null;
}

export function resolvePlatformFaviconUrl(dto: PlatformLoginBrandingDto, buildApiUrl: BuildApiUrlFn): string | null {
  const raw = dto.faviconFileId;
  if (raw == null || !String(raw).trim()) return null;
  return platformPublicAssetUrl(String(raw).trim(), buildApiUrl);
}

/** Fondo sólido login cuando no hay imagen (hex desde BD o neutro). */
export function resolveLoginPageBackground(dto: Partial<PlatformLoginBrandingDto> | null | undefined): string {
  const raw = dto?.pageBackgroundColor?.trim();
  if (raw && /^#[0-9A-Fa-f]{3,8}$/i.test(raw)) return raw;
  return '#0f172a';
}

/** Acento para botón / detalles si hace falta ampliar más adelante. */
export function resolveLoginPrimaryTint(dto: Partial<PlatformLoginBrandingDto> | null | undefined): string {
  const raw = dto?.primaryColor?.trim();
  if (raw && /^#[0-9A-Fa-f]{3,8}$/i.test(raw)) return raw;
  return '#1f6feb';
}

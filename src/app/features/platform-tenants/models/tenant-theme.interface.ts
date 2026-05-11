import type { BrandingResolvedDto } from '../../../core/branding/branding.dto';

export interface TenantThemeColorEntry {
  colorKey: string;
  colorValue: string;
}

export interface TenantThemeTypography {
  fontFamily: string;
  headingFontFamily: string;
  baseFontSize: number;
}

/** Variantes de logo para asignar a sidebar, login, favicon, etc. */
export type TenantLogoVariant = 'primary' | 'alternate' | 'primary_reduced' | 'alternate_reduced';

export interface TenantThemeAssets {
  logoUrl: string | null;
  logoDarkUrl: string | null;
  faviconUrl: string | null;
  loginBackgroundUrl: string | null;
  companyDisplayName: string | null;
  logoReducedUrl: string | null;
  logoDarkReducedUrl: string | null;
  logoSlotSidebar: string | null;
  logoSlotLogin: string | null;
  logoSlotFavicon: string | null;
  logoSlotSidebarCollapsed: string | null;
  /** Archivos en `file_attachment` (misma convención que branding de plataforma). */
  logoFileId?: string | null;
  logoDarkFileId?: string | null;
  logoCompactFileId?: string | null;
  logoCompactDarkFileId?: string | null;
  faviconFileId?: string | null;
  loginBackgroundLightFileId?: string | null;
  loginBackgroundDarkFileId?: string | null;
  appBackgroundPatternFileId?: string | null;
}

export interface TenantThemeConfig {
  tenantId: string;
  tenantCode?: string;
  tenantName?: string;
  strategy: 'guided' | 'custom';
  themeMode: 'light' | 'dark' | 'auto';
  base: {
    primary: string;
    secondary: string;
  };
  typography: TenantThemeTypography;
  assets: TenantThemeAssets;
  overrides: Record<string, string>;
  effectiveTheme: TenantThemeColorEntry[];
  /** GET /platform/tenants/:id/theme con `req` — URLs efectivas + herencia. */
  brandingResolved?: BrandingResolvedDto | null;
}

/** Respuesta PUT /platform/tenants/:id/theme (persist + tema fresco). */
export type TenantThemeSaveResponse = TenantThemeConfig & {
  saved: boolean;
  strategy?: 'guided' | 'custom';
  themeMode?: string;
  generatorVersion?: string;
};

export interface UpdateTenantThemePayload {
  strategy: 'guided' | 'custom';
  /** light | dark | system | auto — persiste en `tenant_branding.theme_mode_default`. */
  themeModeDefault?: string | null;
  accentColor?: string | null;
  base: {
    primary: string;
    secondary?: string;
    themeMode?: 'light' | 'dark' | 'auto';
    fontFamily?: string;
    headingFontFamily?: string;
    baseFontSize?: number;
  };
  assets?: Partial<TenantThemeAssets> & { companyDisplayName?: string | null };
  overrides?: Record<string, string>;
}

/**
 * DTOs alineados al backend de branding unificado (resolveEffectiveTenantBranding / platform settings).
 */

export type ThemeModeDefault = 'light' | 'dark' | 'system';

export interface BrandingAssetSlotDto {
  fileId: string | null;
  url: string | null;
  inheritedFromPlatform: boolean;
}

export interface BrandingAssetsDto {
  logoFullLight: BrandingAssetSlotDto;
  logoFullDark: BrandingAssetSlotDto;
  logoCompactLight: BrandingAssetSlotDto;
  logoCompactDark: BrandingAssetSlotDto;
  favicon: BrandingAssetSlotDto;
  loginBackgroundLight: BrandingAssetSlotDto;
  loginBackgroundDark: BrandingAssetSlotDto;
  appBackgroundPattern: BrandingAssetSlotDto;
  themeModeDefault: ThemeModeDefault | string;
}

export interface BrandingThemeDto {
  primaryColor: string;
  accentColor: string;
  buttonCancelColor: string;
  themeTokenOverrides: unknown;
  darkThemeTokenOverrides: unknown;
}

export interface BrandingResolvedDto {
  source?: string;
  tenantId?: string;
  tenantCode?: string;
  primaryColor: string;
  accentColor: string;
  buttonCancelColor: string;
  themeTokenOverrides: unknown;
  darkThemeTokenOverrides: unknown;
  themeModeDefault: ThemeModeDefault | string;
  assets: BrandingAssetsDto;
  inheritedFromPlatform?: boolean;
}

/**
 * Full onboarding payload for POST /api/v1/platform/tenants.
 * Supports multi-language and future i18n (localization.defaultLanguageCode).
 */

export interface TenantOnboardingLocalizationDto {
  readonly defaultLanguageCode: string;
  readonly timeZone: string;
  readonly currencyCode: string;
  /** ISO-3166 alpha-2; mercado para precio de plan y catálogo regional */
  readonly countryCode?: string;
}

export interface TenantOnboardingBrandingDto {
  readonly logoUrl?: string;
  readonly primaryColor?: string;
  readonly secondaryColor?: string;
  readonly accentColor?: string;
  readonly fontFamily?: string;
}

export interface TenantOnboardingAdminDto {
  readonly fullName?: string;
  readonly email: string;
  readonly username?: string;
  readonly password: string;
  readonly sendInvitation?: boolean;
}

export interface TenantOnboardingDto {
  readonly tenant: { readonly code: string; readonly name: string };
  readonly servicePlanId: number;
  readonly localization: TenantOnboardingLocalizationDto;
  readonly branding?: TenantOnboardingBrandingDto;
  readonly modules?: number[];
  readonly admin: TenantOnboardingAdminDto;
}

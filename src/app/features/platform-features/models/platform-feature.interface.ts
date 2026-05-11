/**
 * Platform feature (capability/permission) from GET /api/v1/platform/features.
 * Associated with a module via moduleCode.
 */
/** Taxonomía de catálogo: CORE (requiere módulo), FEATURE (opcional), ADDON (comercial, sin módulo). */
export type FeatureTypeCode = 'CORE' | 'FEATURE' | 'ADDON';

/** Precios por país; la clave es countryCode (ej. AR, ES). */
export interface FeaturePriceOverrideDto {
  readonly priceMonthly: number | null;
  readonly priceSetup: number | null;
  readonly currencyCode: string | null;
}

export interface PlatformFeature {
  readonly featureId: number;
  readonly code: string | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly moduleCode: string | null;
  /** null = legado / sin clasificar */
  readonly featureType: FeatureTypeCode | null;
  /** Precio mensual de referencia (UX; no factura automática). */
  readonly priceMonthly?: number | null;
  /** Setup de referencia (opcional). */
  readonly priceSetup?: number | null;
  /** Overrides por mercado (vacío = solo precio base). */
  readonly overrides?: Record<string, FeaturePriceOverrideDto>;
  readonly isActive?: boolean;
  /** Consola tenant: ruta, icono Material, jerarquía y orden de menú lateral. */
  readonly route: string | null;
  readonly icon: string | null;
  readonly parentFeatureId: number | null;
  readonly sortOrder: number;
  readonly isMenu: boolean | null;
  readonly isRoute: boolean | null;
  readonly showInSidebar: boolean;
}

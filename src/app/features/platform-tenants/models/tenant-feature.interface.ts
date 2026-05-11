/**
 * Tenant feature assignment (for getTenantFeatures / updateTenantFeatures).
 */

export interface TenantFeature {
  readonly featureCode: string;
  readonly enabled: boolean;
}

/** Cuerpo PUT .../tenants/:id/features (opcional entitlementSource para activación por add-on). */
export type TenantFeatureUpdate = TenantFeature & {
  readonly entitlementSource?: string;
};

/** Features de catálogo sin módulo (GET .../tenants/:id/features/standalone). */
export interface TenantStandaloneFeature {
  readonly featureCode: string;
  readonly featureName: string;
  readonly description: string | null;
  readonly sortOrder: number;
  readonly enabled: boolean;
  /** Catálogo activo (siempre true si la fila existe). */
  readonly platformEnabled: boolean;
  /** Incluido en base del plan (no requiere add-on comercial). */
  readonly planEnabled: boolean;
  /** Contratado como add-on de producto y activo. */
  readonly fromAddon: boolean;
}

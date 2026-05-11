/** Add-on de producto (feature vendible) */
export interface ProductAddonRow {
  readonly productAddonId: number;
  readonly productId: number;
  readonly featureId: number;
  readonly featureCode: string | null;
  readonly featureName: string | null;
  readonly sortOrder: number;
  readonly isSellable: boolean;
  readonly isActive: boolean;
}

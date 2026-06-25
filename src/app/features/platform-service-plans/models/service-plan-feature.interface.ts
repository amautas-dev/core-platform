export interface ServicePlanFeatureModule {
  readonly moduleId: number;
  readonly moduleCode: string | null;
  readonly moduleName: string | null;
}

export interface ServicePlanFeature {
  readonly featureId: number;
  readonly featureCode: string;
  readonly featureName: string | null;
  readonly featureType: string | null;
  readonly isActive: boolean;
  readonly assigned: boolean;
  readonly module: ServicePlanFeatureModule | null;
}

export interface ServicePlanFeaturesResponse {
  readonly plan: {
    readonly servicePlanId: number;
    readonly planCode: string;
    readonly planName: string;
    readonly isActive: boolean;
  };
  readonly product: {
    readonly productId: number;
    readonly productCode: string | null;
    readonly productName: string | null;
    readonly isActive: boolean;
  } | null;
  readonly countryCode: string;
  readonly source: 'service_plan_feature';
  readonly assignedFeatures: ServicePlanFeature[];
  readonly availableFeatures: ServicePlanFeature[];
}

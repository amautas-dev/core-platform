export interface PlatformFeaturePermission {
  readonly permissionId: number;
  readonly permissionCode: string;
  readonly permissionName: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly assigned: boolean;
}

export interface PlatformFeaturePermissionsResponse {
  readonly feature: {
    readonly featureId: number;
    readonly featureCode: string | null;
    readonly featureName: string | null;
    readonly isActive: boolean;
    readonly module: {
      readonly moduleId: number;
      readonly moduleCode: string | null;
      readonly moduleName: string | null;
    } | null;
  };
  readonly source: 'feature_permission';
  readonly assignedPermissions: PlatformFeaturePermission[];
  readonly availablePermissions: PlatformFeaturePermission[];
}

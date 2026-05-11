/**
 * Tenant usage metrics from GET /api/v1/platform/tenants/:id/usage
 */

export interface TenantUsageLimit {
  readonly limitCode: string;
  readonly limitValue: number;
}

export interface TenantUsage {
  readonly usersUsed: number;
  readonly modulesEnabled: number;
  readonly limits: readonly TenantUsageLimit[];
}

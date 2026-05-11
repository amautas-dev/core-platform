/**
 * Platform tenant (SaaS) entity.
 * List endpoint may include servicePlanId, planName, usersCount, modulesCount when available.
 */

export interface Tenant {
  readonly tenantId: number;
  readonly tenantCode: string;
  readonly tenantName: string;
  readonly servicePlanId: number;
  readonly isActive: boolean;
  readonly createdAt: string;
  /** Plan name when provided by backend (otherwise resolved via planNameById from service plans). */
  readonly planName?: string | null;
  /** User count when provided by list endpoint. */
  readonly usersCount?: number;
  /** Enabled modules count when provided by list endpoint. */
  readonly modulesCount?: number;
}

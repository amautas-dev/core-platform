/**
 * DTO for creating a platform tenant.
 */

export interface CreateTenantDto {
  readonly tenantCode: string;
  readonly tenantName: string;
  readonly servicePlanId: number;
}

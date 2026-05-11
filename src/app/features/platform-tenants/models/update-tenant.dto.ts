/**
 * DTO for updating a platform tenant (partial).
 */

export interface UpdateTenantDto {
  readonly tenantCode?: string;
  readonly tenantName?: string;
  readonly servicePlanId?: number;
  readonly countryCode?: string | null;
  readonly hostingDeployment?: 'amautas' | 'external';
  readonly isActive?: boolean;
}

/**
 * Tenant user from GET /api/v1/platform/tenants/:id/users.
 */

export interface TenantUser {
  readonly userId: number;
  readonly username: string;
  readonly email: string | null;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly roleId: number | null;
  readonly roleCode: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
}

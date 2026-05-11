/**
 * Tenant user from GET /api/v1/platform/tenants/:id/users (read-only).
 */

export interface TenantUser {
  readonly userId: number;
  readonly username: string;
  readonly email: string | null;
  readonly roleCode: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
}

/**
 * Platform role (administrator role) entity.
 */

export interface Role {
  readonly roleId: number;
  readonly roleCode: string;
  readonly roleName: string;
  readonly description: string;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly deactivatedAt?: string | null;
  readonly deactivatedBy?: number | null;
}

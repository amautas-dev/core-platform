/**
 * Platform user (administrator) entity.
 * Soft delete: isActive, deactivatedAt, deactivatedBy (no DELETE en API).
 */

export interface PlatformUser {
  readonly platformUserId: number;
  readonly username: string;
  readonly email: string;
  readonly roleCode: string;
  readonly isActive: boolean;
  readonly lastLoginAt?: string | null;
  readonly createdAt: string;
  readonly deactivatedAt?: string | null;
  readonly deactivatedBy?: number | null;
}

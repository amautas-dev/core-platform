/**
 * DTO for updating a platform user (partial).
 */

export interface UpdatePlatformUserDto {
  readonly username?: string;
  readonly email?: string;
  readonly roleCode?: string;
  readonly isActive?: boolean;
}

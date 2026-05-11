/**
 * DTO for updating a platform role (partial).
 */

export interface UpdateRoleDto {
  readonly roleCode?: string;
  readonly roleName?: string;
  readonly description?: string;
  readonly isActive?: boolean;
}

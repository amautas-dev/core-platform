/**
 * DTO for creating a platform role.
 */

export interface CreateRoleDto {
  readonly roleCode: string;
  readonly roleName: string;
  readonly description: string;
}

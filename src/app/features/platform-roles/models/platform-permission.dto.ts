/**
 * Item from GET /api/v1/platform/permissions.
 * Los permisos no deben estar hardcodeados; vienen del backend.
 */
export interface PlatformPermissionDto {
  readonly module: string;
  readonly action: string;
}

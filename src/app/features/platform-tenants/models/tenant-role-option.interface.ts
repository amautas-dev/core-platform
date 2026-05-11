/** GET /api/v1/platform/tenants/:id/roles */
export interface TenantRoleOption {
  readonly roleId: number;
  readonly roleCode: string | null;
  readonly roleName: string | null;
}

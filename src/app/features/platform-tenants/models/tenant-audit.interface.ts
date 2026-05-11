/**
 * Tenant audit log entry from GET /api/v1/platform/tenants/:id/audit
 */

export interface TenantAudit {
  readonly auditId: number;
  readonly actionCode: string;
  readonly tableName: string;
  readonly changedAt: string;
  readonly changedByUserId: number | null;
}

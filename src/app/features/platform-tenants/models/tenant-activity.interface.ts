/**
 * Tenant activity entry from GET /api/v1/platform/tenants/:id/activity
 */

export interface TenantActivityItem {
  readonly createdAt: string;
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string | null;
  readonly metadata: Record<string, unknown> | null;
  readonly userId: number | null;
  readonly userEmail: string | null;
}

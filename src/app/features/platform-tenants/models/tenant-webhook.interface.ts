/**
 * Tenant webhook from GET/POST /api/v1/platform/tenants/:id/webhooks.
 */

export interface TenantWebhook {
  readonly id: number;
  readonly url: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

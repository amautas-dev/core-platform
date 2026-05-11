/**
 * Tenant API key from GET/POST /api/v1/platform/tenants/:id/api-keys.
 * Keys are never regenerated; only deactivation is supported.
 */

export interface TenantApiKey {
  readonly id: number;
  readonly name: string;
  readonly apiKey: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

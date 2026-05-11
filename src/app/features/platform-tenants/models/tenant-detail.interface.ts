/**
 * Tenant detail from GET /api/v1/platform/tenants/:id
 */

import type { Tenant } from './tenant.interface';

export interface TenantRecentActivity {
  readonly actionCode: string;
  readonly tableName: string;
  readonly changedAt: string;
}

/** Línea de producto: plan vigente por productId (suscripción abierta). */
export interface TenantServiceSubscriptionLine {
  readonly subscriptionId: number;
  readonly productId: number | null;
  readonly productCode?: string | null;
  readonly productName?: string | null;
  readonly servicePlanId: number | null;
  readonly planName?: string | null;
  readonly startDate?: string | null;
}

export interface TenantDetail extends Tenant {
  /** ISO-3166 alpha-2; mercado para precios/catálogo regional */
  readonly countryCode?: string | null;
  /** `amautas` = hosting gestionado; `external` = infra del cliente. */
  readonly hostingDeployment?: 'amautas' | 'external' | string | null;
  readonly planName?: string | null;
  readonly usersCount?: number;
  readonly modulesEnabledCount?: number;
  readonly recentActivity?: readonly TenantRecentActivity[];
  /** Suscripciones abiertas por producto (vacío si solo hay datos legacy sin producto). */
  readonly serviceSubscriptions?: readonly TenantServiceSubscriptionLine[];
}

/**
 * Service plan from GET /platform/service-plans (for lookup by servicePlanId).
 * API returns servicePlanId (id), planCode, planName (name).
 */
export interface ServicePlan {
  readonly servicePlanId: number;
  readonly planCode?: string;
  readonly planName?: string;
  readonly servicePlanName?: string;
  readonly description?: string | null;
  /** Línea comercial; planes del mismo producto para el selector por tenant. */
  readonly productId?: number | null;
  readonly price?: number;
  readonly currency?: string;
}

/**
 * Platform service plan (SaaS subscription plan) entity.
 */

export interface ServicePlan {
  readonly servicePlanId: number;
  readonly planCode: string;
  readonly planName: string;
  readonly description?: string | null;
  readonly productId?: number | null;
  readonly price: number;
  readonly currency: string;
  /** regional | legacy (API) */
  readonly priceSource?: string;
  readonly priceCountry?: string | null;
  /** regional = fila por país; base = solo plantilla service_plan */
  readonly displaySource?: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

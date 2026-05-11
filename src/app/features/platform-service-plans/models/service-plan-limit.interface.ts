/**
 * Limit for a service plan (limitCode + value).
 * GET/PUT /api/v1/platform/service-plans/:id/limits
 */

export interface ServicePlanLimit {
  readonly limitCode: string;
  readonly limitValue: number;
}

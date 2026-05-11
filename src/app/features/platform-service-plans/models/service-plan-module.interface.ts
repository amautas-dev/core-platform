/**
 * Module assignment for a service plan.
 * GET/PUT /api/v1/platform/service-plans/:id/modules
 */

export interface ServicePlanModule {
  readonly moduleId: number;
  readonly moduleCode: string | null;
  readonly moduleName: string | null;
  readonly enabled: boolean;
}

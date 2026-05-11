/**
 * Platform module from GET /api/v1/platform/modules.
 * Supports platform enable/disable, plan assignment (service_plan_module), tenant assignment (tenant_module).
 */
export interface PlatformModule {
  readonly moduleId: number;
  readonly code: string | null;
  readonly name: string | null;
  readonly description: string | null;
  readonly isActive: boolean;
}

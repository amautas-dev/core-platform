/**
 * Tenant module from GET /api/v1/platform/tenants/:id/modules
 * Entitlements: plan + add-ons; `editable` solo si PLATFORM_ALLOW_MODULE_MANUAL_OVERRIDE en API.
 */
export interface TenantModule {
  readonly moduleId: number;
  readonly moduleCode: string | null;
  readonly moduleName: string | null;
  readonly description: string | null;
  readonly planEnabled: boolean;
  /** Módulo activado como add-on (fuera del plan base). */
  readonly fromAddon: boolean;
  readonly tenantEnabled: boolean;
  /** Igual que tenantEnabled tras sync (plan ∨ add-on). */
  readonly effectiveEnabled: boolean;
  readonly platformEnabled: boolean;
  /** Si la API permite PATCH manual de tenant_module (override de plataforma). */
  readonly editable: boolean;
  readonly implementationStatus?: string;
}

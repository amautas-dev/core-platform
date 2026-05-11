/**
 * Module assignment for a product.
 * GET/PUT /api/v1/platform/products/:id/modules
 */

export interface ProductModule {
  readonly moduleId: number;
  readonly moduleCode: string | null;
  readonly moduleName: string | null;
  readonly enabled: boolean;
}

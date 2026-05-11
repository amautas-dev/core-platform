/**
 * Platform product from GET /api/v1/platform/products
 */

export interface Product {
  readonly productId: number;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly description: string | null;
  /** Costo único de puesta en marcha (referencia Amautas). */
  readonly setupFeeAmautas?: number | null;
  /** Costo único de puesta en marcha (referencia entorno cliente). */
  readonly setupFeeClient?: number | null;
  /**
   * Legacy en BD; ya no se edita desde el formulario de producto.
   * Infra recurrente prevista en `tenant_infrastructure_config` (TODO).
   */
  readonly hostingMonthlyFeeAmautas?: number | null;
  readonly isActive: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string | null;
  /** When API includes it in list response */
  readonly moduleCount?: number;
  /** When API includes it in list response */
  readonly tenantCount?: number;
}

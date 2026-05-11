/**
 * DTO for updating a service plan (partial).
 */

export interface UpdateServicePlanDto {
  readonly planCode?: string;
  readonly planName?: string;
  readonly description?: string | null;
  readonly price?: number;
  readonly currency?: string;
  readonly isActive?: boolean;
}

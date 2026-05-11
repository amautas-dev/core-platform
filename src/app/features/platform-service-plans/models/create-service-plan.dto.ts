/**
 * DTO for creating a service plan.
 */

export interface CreateServicePlanDto {
  readonly planCode: string;
  readonly planName: string;
  readonly description?: string | null;
  readonly price: number;
  readonly currency: string;
}

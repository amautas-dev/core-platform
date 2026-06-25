import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { ServicePlan } from '../models/service-plan.interface';
import { ServicePlanLimit } from '../models/service-plan-limit.interface';
import { ServicePlanModule } from '../models/service-plan-module.interface';
import { CreateServicePlanDto } from '../models/create-service-plan.dto';
import { UpdateServicePlanDto } from '../models/update-service-plan.dto';
import { ServicePlanFeaturesResponse } from '../models/service-plan-feature.interface';

/** Path relative to apiUrl (e.g. apiUrl = .../api → .../api/v1/platform/service-plans) */
const BASE_PATH = 'v1/platform/service-plans';

@Injectable({ providedIn: 'root' })
export class ServicePlanService {
  private readonly api = inject(ApiService);

  getPlans(params?: {
    country?: string;
    productId?: number;
    tenantId?: number;
    includeInactive?: boolean;
  }): Observable<ServicePlan[]> {
    return this.api.get<ServicePlan[]>(BASE_PATH, params);
  }

  getPlan(id: number, country?: string): Observable<ServicePlan> {
    return this.api.get<ServicePlan>(`${BASE_PATH}/${id}`, { country });
  }

  createPlan(data: CreateServicePlanDto): Observable<ServicePlan> {
    return this.api.post<ServicePlan>(BASE_PATH, data);
  }

  /**
   * @param country - mercado del precio (query `country`); default API = AR. Debe coincidir con la lista al editar.
   */
  updatePlan(id: number, data: UpdateServicePlanDto, country?: string): Observable<ServicePlan> {
    return this.api.put<ServicePlan>(
      `${BASE_PATH}/${id}`,
      data,
      country != null && country !== '' ? { country } : undefined,
    );
  }

  getPlanLimits(planId: number): Observable<ServicePlanLimit[]> {
    return this.api.get<ServicePlanLimit[]>(`${BASE_PATH}/${planId}/limits`);
  }

  updatePlanLimits(planId: number, limits: ServicePlanLimit[]): Observable<ServicePlanLimit[]> {
    return this.api.put<ServicePlanLimit[]>(`${BASE_PATH}/${planId}/limits`, limits);
  }

  getPlanModules(planId: number, country?: string): Observable<ServicePlanModule[]> {
    return this.api.get<ServicePlanModule[]>(`${BASE_PATH}/${planId}/modules`, {
      country: country ?? undefined,
    });
  }

  updatePlanModules(
    planId: number,
    modules: { moduleId: number; enabled: boolean }[],
    country?: string
  ): Observable<ServicePlanModule[]> {
    return this.api.put<ServicePlanModule[]>(
      `${BASE_PATH}/${planId}/modules`,
      modules,
      country != null && country !== '' ? { country } : undefined,
    );
  }

  getPlanFeatures(planId: number, country?: string): Observable<ServicePlanFeaturesResponse> {
    return this.api.get<ServicePlanFeaturesResponse>(`${BASE_PATH}/${planId}/features`, {
      country: country ?? undefined,
    });
  }

  updatePlanFeatures(
    planId: number,
    featureIds: number[],
    country?: string
  ): Observable<ServicePlanFeaturesResponse> {
    return this.api.put<ServicePlanFeaturesResponse>(
      `${BASE_PATH}/${planId}/features`,
      { featureIds },
      country != null && country !== '' ? { country } : undefined,
    );
  }
}

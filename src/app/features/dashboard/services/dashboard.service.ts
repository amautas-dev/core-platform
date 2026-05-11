import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

/** Plan metric for tenants or revenue */
export interface PlanMetric {
  planId?: number | null;
  planCode?: string;
  planName: string;
  count?: number;
  revenue?: number;
}

/** Top module by usage */
export interface TopModule {
  moduleId?: number | null;
  moduleCode?: string | null;
  moduleName?: string;
  tenantCount?: number;
  count?: number;
}

/** Top feature by usage */
export interface TopFeature {
  featureCode: string;
  usageValue?: number;
  count?: number;
}

/** Platform metrics from GET /api/v1/platform/metrics */
export interface PlatformMetrics {
  totalTenants: number;
  activeTenants: number;
  totalPlatformUsers: number;
  activePlatformUsers: number;
  totalUsers: number;
  activeUsers: number;
  totalApiKeys: number;
  activeApiKeys: number;
  totalModules: number;
  enabledModules: number;
  queuedJobs: number;
  webhookEvents: number;
  monthlyUsage: number;
  monthlyRevenue: number;
  newTenantsThisMonth?: number;
  tenantsByPlan?: PlanMetric[];
  revenueByPlan?: PlanMetric[];
  failedJobs?: number;
  failedWebhooks?: number;
  rateLimitHits?: number;
  topModules?: TopModule[];
  topFeatures?: TopFeature[];
}

const METRICS_PATH = 'v1/platform/metrics';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly api = inject(ApiService);

  /** Fetches platform metrics from GET /api/v1/platform/metrics. */
  getPlatformMetrics(): Observable<PlatformMetrics> {
    return this.api.get<PlatformMetrics>(METRICS_PATH);
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';

export interface SystemHealthWorkers {
  queuedJobs: number;
  activeJobs: number;
  failedJobs: number;
  delayedJobs: number;
}

export interface SystemHealthMemoryUsage {
  usedMb?: number;
  freeMb?: number;
  totalMb?: number;
  usagePercent?: number;
}

export interface SystemHealthSystem {
  uptime: number;
  nodeVersion: string;
  memoryUsage: SystemHealthMemoryUsage;
  environment: string;
}

export interface SystemHealthResponse {
  database: string;
  redis: string;
  workers: SystemHealthWorkers;
  system: SystemHealthSystem;
}

const SYSTEM_HEALTH_PATH = 'v1/platform/system-health';

@Injectable({ providedIn: 'root' })
export class SystemHealthService {
  private readonly api = inject(ApiService);

  getSystemHealth(): Observable<SystemHealthResponse> {
    return this.api.get<SystemHealthResponse>(SYSTEM_HEALTH_PATH);
  }
}

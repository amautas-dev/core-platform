import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { PlatformFeature } from '../models/platform-feature.interface';
import { PlatformModule } from '../../platform-modules/models/platform-module.interface';

const FEATURES_PATH = 'v1/platform/features';
const MODULES_PATH = 'v1/platform/modules';

/** Payload for create/update feature. */
export interface FeatureUpsertDto {
  code: string;
  name?: string | null;
  description?: string | null;
  /** CORE | FEATURE | ADDON; null borra la clasificación en update */
  featureType?: string | null;
  moduleCode?: string | null;
  route?: string | null;
  icon?: string | null;
  parentFeatureId?: number | null;
  sortOrder?: number;
  isMenu?: boolean | null;
  isRoute?: boolean | null;
  showInSidebar?: boolean;
  priceMonthly?: number | null;
  priceSetup?: number | null;
  /** En update, si se omite la clave, no se modifican los overrides existentes. */
  overrides?: Array<{
    countryCode: string;
    priceMonthly?: number | null;
    priceSetup?: number | null;
    currencyCode?: string | null;
  }>;
}

@Injectable({ providedIn: 'root' })
export class PlatformFeaturesService {
  private readonly api = inject(ApiService);

  getFeatures(): Observable<PlatformFeature[]> {
    return this.api.get<PlatformFeature[]>(FEATURES_PATH);
  }

  getFeature(id: number): Observable<PlatformFeature> {
    return this.api.get<PlatformFeature>(`${FEATURES_PATH}/${id}`);
  }

  createFeature(dto: FeatureUpsertDto): Observable<PlatformFeature> {
    return this.api.post<PlatformFeature>(FEATURES_PATH, dto);
  }

  updateFeature(id: number, dto: Partial<FeatureUpsertDto>): Observable<PlatformFeature> {
    return this.api.put<PlatformFeature>(`${FEATURES_PATH}/${id}`, dto);
  }

  deleteFeature(id: number): Observable<void> {
    return this.api.delete<void>(`${FEATURES_PATH}/${id}`);
  }

  /** Load modules for dropdown (moduleCode) when creating/editing features. */
  getModules(): Observable<PlatformModule[]> {
    return this.api.get<PlatformModule[]>(MODULES_PATH);
  }
}

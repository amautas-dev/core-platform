import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import type { CountryMarket } from '../models/country-market.interface';

const BASE_PATH = 'v1/platform/countries';

@Injectable({ providedIn: 'root' })
export class CountriesService {
  private readonly api = inject(ApiService);

  list(): Observable<CountryMarket[]> {
    return this.api.get<CountryMarket[]>(BASE_PATH);
  }
}

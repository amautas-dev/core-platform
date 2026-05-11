import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../core/api/api.service';
import { Product } from '../models/product.interface';
import { ProductModule } from '../models/product-module.interface';
import type { ProductAddonRow } from '../models/product-addon.interface';

const BASE_PATH = 'v1/platform/products';

export interface CreateProductDto {
  productCode: string;
  productName?: string | null;
  description?: string | null;
  setupFeeAmautas?: number | null;
  setupFeeClient?: number | null;
  hostingMonthlyFeeAmautas?: number | null;
  isActive?: boolean;
}

export interface UpdateProductDto {
  productCode?: string | null;
  productName?: string | null;
  description?: string | null;
  setupFeeAmautas?: number | null;
  setupFeeClient?: number | null;
  hostingMonthlyFeeAmautas?: number | null;
  isActive?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly api = inject(ApiService);

  getProducts(): Observable<Product[]> {
    return this.api.get<Product[]>(BASE_PATH);
  }

  getProduct(id: number): Observable<Product> {
    return this.api.get<Product>(`${BASE_PATH}/${id}`);
  }

  createProduct(data: CreateProductDto): Observable<Product> {
    return this.api.post<Product>(BASE_PATH, data);
  }

  updateProduct(id: number, data: UpdateProductDto): Observable<Product> {
    return this.api.put<Product>(`${BASE_PATH}/${id}`, data);
  }

  deleteProduct(id: number): Observable<void> {
    return this.api.delete<void>(`${BASE_PATH}/${id}`);
  }

  getProductModules(productId: number, country?: string): Observable<ProductModule[]> {
    return this.api.get<ProductModule[]>(`${BASE_PATH}/${productId}/modules`, {
      country: country ?? undefined,
    });
  }

  updateProductModules(
    productId: number,
    modules: { moduleId: number; enabled: boolean }[],
    country?: string
  ): Observable<ProductModule[]> {
    return this.api.put<ProductModule[]>(
      `${BASE_PATH}/${productId}/modules`,
      modules,
      country != null && country !== '' ? { country } : undefined,
    );
  }

  getProductAddons(productId: number, country?: string): Observable<ProductAddonRow[]> {
    return this.api.get<ProductAddonRow[]>(`${BASE_PATH}/${productId}/addons`, {
      country: country ?? undefined,
    });
  }
}

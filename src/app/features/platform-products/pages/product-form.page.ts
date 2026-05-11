import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProductsService } from '../services/products.service';
import { PlatformModulesService } from '../../platform-modules/services/platform-modules.service';
import { PlatformModule } from '../../platform-modules/models/platform-module.interface';
import { CreateProductDto } from '../services/products.service';
import { ProductModule } from '../models/product-module.interface';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

export interface ModuleOption {
  moduleId: number;
  moduleCode: string | null;
  moduleName: string | null;
  enabled: boolean;
}

@Component({
  selector: 'app-product-form-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './product-form.page.html',
  styleUrls: ['./product-form.page.scss'],
})
export class ProductFormPage implements OnInit {
  private static optFee(v: unknown): number | null {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(ProductsService);
  private readonly modulesService = inject(PlatformModulesService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly routePaths = inject(PlatformRoutePathsService);

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly isEdit = signal(false);
  readonly productId = signal<number | null>(null);
  readonly allModules = signal<ModuleOption[]>([]);
  readonly modulesLoading = signal(false);
  readonly modulesSaving = signal(false);
  /** Catálogo regional al editar desde el hub (`?country=`) */
  readonly catalogCountry = signal<string>('');

  readonly form = this.fb.nonNullable.group({
    productCode: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(50)]],
    productName: ['', [Validators.maxLength(150)]],
    description: ['', [Validators.maxLength(2000)]],
    setupFeeAmautas: [null as number | null],
    setupFeeClient: [null as number | null],
    isActive: [true],
  });

  readonly backLink = computed(() =>
    this.isEdit() && this.productId() != null
      ? this.routePaths.catalogProductDetail(this.productId()!)
      : this.routePaths.catalogProducts()
  );

  ngOnInit(): void {
    const cq = this.route.snapshot.queryParamMap.get('country');
    if (cq && cq.trim() !== '') {
      this.catalogCountry.set(cq.trim().toUpperCase().slice(0, 2));
    }
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const numId = parseInt(id, 10);
      if (!isNaN(numId)) {
        this.productId.set(numId);
        this.isEdit.set(true);
        this.loadProduct(numId);
      }
    }
    this.loadPlatformModules();
  }

  private loadProduct(id: number): void {
    this.loading.set(true);
    this.productsService.getProduct(id).subscribe({
      next: (product) => {
        this.form.patchValue({
          productCode: product.productCode ?? '',
          productName: product.productName ?? '',
          description: product.description ?? '',
          setupFeeAmautas: product.setupFeeAmautas ?? null,
          setupFeeClient: product.setupFeeClient ?? null,
          isActive: product.isActive,
        });
        this.loading.set(false);
        this.productsService.getProductModules(id, this.catalogCountry() || undefined).subscribe({
          next: (list) => this.applyProductModulesToOptions(list),
        });
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al cargar producto');
        this.loading.set(false);
      },
    });
  }

  private loadPlatformModules(): void {
    this.modulesLoading.set(true);
    this.modulesService.getModules().subscribe({
      next: (list) => {
        const options: ModuleOption[] = list.map((m) => ({
          moduleId: m.moduleId,
          moduleCode: m.code,
          moduleName: m.name,
          enabled: false,
        }));
        this.allModules.set(options);
        this.modulesLoading.set(false);
      },
      error: () => this.modulesLoading.set(false),
    });
  }

  private applyProductModulesToOptions(productModules: ProductModule[]): void {
    const enabledSet = new Set(productModules.filter((m) => m.enabled).map((m) => m.moduleId));
    this.allModules.update((opts) =>
      opts.map((o) => ({
        ...o,
        enabled: o.moduleCode === 'basic' || enabledSet.has(o.moduleId),
      }))
    );
  }

  toggleModule(option: ModuleOption): void {
    if (option.moduleCode === 'basic') return;
    this.allModules.update((opts) =>
      opts.map((o) => (o.moduleId === option.moduleId ? { ...o, enabled: !o.enabled } : o))
    );
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const id = this.productId();
    const raw = this.form.getRawValue();
    /** Sin `hostingMonthlyFeeAmautas`: el producto no gestiona infra aquí; no enviar para no pisar valores legacy en BD. */
    const data: CreateProductDto = {
      productCode: raw.productCode,
      productName: raw.productName || null,
      description: raw.description || null,
      setupFeeAmautas: ProductFormPage.optFee(raw.setupFeeAmautas),
      setupFeeClient: ProductFormPage.optFee(raw.setupFeeClient),
      isActive: raw.isActive,
    };

    if (id !== null) {
      this.productsService.updateProduct(id, data).subscribe({
        next: () => this.saveModulesAndNavigate(id),
        error: (err) => {
          this.error.set(err?.message ?? 'Error al actualizar producto');
          this.loading.set(false);
        },
      });
    } else {
      this.productsService.createProduct(data).subscribe({
        next: (created) => {
          const newId = created.productId;
          this.saveModulesAndNavigate(newId);
        },
        error: (err) => {
          this.error.set(err?.message ?? 'Error al crear producto');
          this.loading.set(false);
        },
      });
    }
  }

  private saveModulesAndNavigate(productId: number): void {
    const payload = this.allModules()
      .filter((o) => o.enabled)
      .map((o) => ({ moduleId: o.moduleId, enabled: true }));
    this.productsService.updateProductModules(productId, payload, this.catalogCountry() || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        const cc = this.catalogCountry();
        const base = this.routePaths.catalogProductDetail(productId);
        void this.router.navigateByUrl(cc ? `${base}?country=${encodeURIComponent(cc)}` : base);
      },
      error: () => {
        this.loading.set(false);
        const cc = this.catalogCountry();
        const base = this.routePaths.catalogProductDetail(productId);
        void this.router.navigateByUrl(cc ? `${base}?country=${encodeURIComponent(cc)}` : base);
      },
    });
  }
}

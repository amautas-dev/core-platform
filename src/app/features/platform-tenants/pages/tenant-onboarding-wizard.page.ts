import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  AsyncValidatorFn,
  ValidationErrors,
} from '@angular/forms';
import { Observable, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, take, map, switchMap, catchError, startWith } from 'rxjs/operators';
import { MatStepperModule, MatStepper } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TenantService } from '../services/tenant.service';
import { ServicePlanService } from '../../platform-service-plans/services/service-plan.service';
import { ProductsService } from '../../platform-products/services/products.service';
import { CountriesService } from '../../platform-products/services/countries.service';
import type { CountryMarket } from '../../platform-products/models/country-market.interface';
import type { ServicePlan } from '../models/service-plan.interface';
import type { ServicePlanModule } from '../../platform-service-plans/models/service-plan-module.interface';
import type { Product } from '../../platform-products/models/product.interface';
import type { ProductModule } from '../../platform-products/models/product-module.interface';
import type { TenantOnboardingDto } from '../models/tenant-onboarding.dto';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';

const DEFAULT_LANGUAGE = 'es';
const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
const DEFAULT_CURRENCY = 'ARS';

export type PasswordStrengthLevel = 'weak' | 'medium' | 'strong';

/** Evaluate password strength from length, uppercase, lowercase, numbers, symbols. Returns level and score 0–3 for bar. */
export function getPasswordStrength(password: string): { level: PasswordStrengthLevel; score: number } {
  if (!password || typeof password !== 'string') return { level: 'weak', score: 0 };
  const pwd = password;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[a-z]/.test(pwd)) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/\d/.test(pwd)) score++;
  if (/[^a-zA-Z0-9]/.test(pwd)) score++;
  // Map 0–2 → weak, 3–4 → medium, 5–6 → strong; bar segments 0–3
  if (score <= 2) return { level: 'weak', score: Math.min(1, Math.ceil(score / 2)) };
  if (score <= 4) return { level: 'medium', score: 2 };
  return { level: 'strong', score: 3 };
}

/** Slug from name: lowercase, remove spaces, remove accents. e.g. "Distribuidora Ali" → "distribuidoraali" */
function slugFromName(name: string): string {
  if (typeof name !== 'string' || !name.trim()) return '';
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '');
}

function tenantCodeAvailabilityValidator(tenantService: TenantService): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    return (control.valueChanges ?? of(control.value)).pipe(
      startWith(control.value),
      debounceTime(400),
      distinctUntilChanged(),
      switchMap((value: unknown) => {
        const code = typeof value === 'string' ? value : '';
        if (code.trim().length < 2) return of(null);
        return tenantService.checkTenantCodeAvailable(code).pipe(
          map((res) => (res.available ? null : { tenantCodeExists: true })),
          catchError(() => of(null))
        );
      }),
      take(1)
    );
  };
}

@Component({
  selector: 'app-tenant-onboarding-wizard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './tenant-onboarding-wizard.page.html',
  styleUrls: ['./tenant-onboarding-wizard.page.scss'],
})
export class TenantOnboardingWizardPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly tenantService = inject(TenantService);
  private readonly planService = inject(ServicePlanService);
  private readonly productsService = inject(ProductsService);
  private readonly countriesService = inject(CountriesService);
  private readonly router = inject(Router);
  readonly paths = inject(PlatformRoutePathsService);

  @ViewChild(MatStepper) stepper!: MatStepper;

  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<{ tenantCode: string; tenantName: string } | null>(null);
  readonly plans = signal<ServicePlan[]>([]);
  readonly planModules = signal<ServicePlanModule[]>([]);
  readonly products = signal<Product[]>([]);
  readonly productModules = signal<ProductModule[]>([]);
  readonly countries = signal<CountryMarket[]>([]);
  readonly showInactivePlans = signal(false);

  /** Step 1: Organization */
  readonly step1 = this.fb.nonNullable.group({
    tenantName: ['', [Validators.required, Validators.minLength(2)]],
    tenantCode: ['', [Validators.required, Validators.minLength(2)]],
  });

  /** Add async validator for tenantCode (runs when value changes, debounced). */
  private initTenantCodeAsyncValidator(): void {
    const control = this.step1.get('tenantCode');
    if (control) {
      control.addAsyncValidators(tenantCodeAvailabilityValidator(this.tenantService));
    }
  }

  /** When tenantName changes, fill tenantCode with a slug if tenantCode is empty. */
  private initTenantCodeFromName(): void {
    const nameControl = this.step1.get('tenantName');
    const codeControl = this.step1.get('tenantCode');
    if (!nameControl || !codeControl) return;
    nameControl.valueChanges.subscribe((name) => {
      const code = codeControl.value ?? '';
      if (typeof code !== 'string' || code.trim() === '') {
        const slug = slugFromName(name ?? '');
        if (slug) codeControl.setValue(slug, { emitEvent: true });
      }
    });
  }

  /** Step 2: País + plan */
  readonly step2 = this.fb.nonNullable.group({
    countryCode: ['AR', Validators.required],
    servicePlanId: [0, [Validators.required, Validators.min(1)]],
  });

  /** Step 3: Product (optional: 0 = use plan modules) */
  readonly step3Product = this.fb.nonNullable.group({
    productId: [0],
  });

  /** Step 4: Modules (selection via signal) */
  readonly step4ModuleIds = signal<Set<number>>(new Set());

  /** Step 5: Admin User */
  readonly step5 = this.fb.nonNullable.group({
    adminName: ['', Validators.required],
    adminEmail: ['', [Validators.required, Validators.email]],
    adminPassword: ['', [Validators.required, Validators.minLength(8)]],
    sendInvitationEmail: [true],
  });

  /** Password strength (weak / medium / strong) and bar score 0–3, updated from adminPassword valueChanges. */
  readonly passwordStrength = signal<{ level: PasswordStrengthLevel; score: number }>({ level: 'weak', score: 0 });

  /** Review step: create API key for the tenant after onboarding (optional). */
  readonly createApiKey = signal(false);

  readonly selectedPlanName = computed(() => {
    const id = this.step2.getRawValue().servicePlanId;
    const p = this.plans().find((x) => x.servicePlanId === id);
    return p ? (p.planName ?? p.servicePlanName ?? String(id)) : '';
  });

  planDisplayName(plan: ServicePlan): string {
    return plan.planName ?? plan.servicePlanName ?? String(plan.servicePlanId);
  }

  /** Modules to show in the module step: from selected product, or from plan when no product. */
  readonly modulesForSelection = computed(() => {
    const productId = this.step3Product.getRawValue().productId;
    if (productId > 0) {
      return this.productModules().filter((m) => m.enabled);
    }
    return this.enabledPlanModules();
  });

  readonly summary = computed(() => {
    const s1 = this.step1.getRawValue();
    const s2 = this.step2.getRawValue();
    const s5 = this.step5.getRawValue();
    const mods = this.modulesForSelection().filter((m) => this.step4ModuleIds().has(m.moduleId));
    return {
      tenantName: s1.tenantName,
      tenantCode: s1.tenantCode,
      planName: this.selectedPlanName(),
      productName: this.selectedProductName(),
      modulesCount: mods.length,
      moduleNames: mods.map((m) => m.moduleName ?? m.moduleCode ?? m.moduleId).join(', ') || '—',
      adminName: s5.adminName,
      adminEmail: s5.adminEmail,
      sendInvitationEmail: s5.sendInvitationEmail,
    };
  });

  ngOnInit(): void {
    this.initTenantCodeAsyncValidator();
    this.initTenantCodeFromName();
    this.initPasswordStrength();
    this.countriesService.list().subscribe({
      next: (list) => this.countries.set(list),
      error: () => this.countries.set([]),
    });
    this.loadPlans();
    this.loadProducts();
  }

  private initPasswordStrength(): void {
    const control = this.step5.get('adminPassword');
    if (!control) return;
    control.valueChanges.subscribe((value) => {
      this.passwordStrength.set(getPasswordStrength(value ?? ''));
    });
    this.passwordStrength.set(getPasswordStrength(control.value ?? ''));
  }

  private loadPlans(): void {
    this.loading.set(true);
    const cc = this.step2.getRawValue().countryCode || 'AR';
    this.tenantService
      .getServicePlans({ country: cc, includeInactive: this.showInactivePlans() || undefined })
      .subscribe({
      next: (list) => {
        this.plans.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Error loading plans');
        this.loading.set(false);
      },
    });
  }

  onCountryChangeForPlans(): void {
    this.step2.patchValue({ servicePlanId: 0 });
    this.planModules.set([]);
    this.step4ModuleIds.set(new Set());
    this.loadPlans();
  }

  onShowInactivePlansChange(checked: boolean): void {
    this.showInactivePlans.set(checked);
    this.step2.patchValue({ servicePlanId: 0 });
    this.planModules.set([]);
    this.step4ModuleIds.set(new Set());
    this.loadPlans();
  }

  private loadProducts(): void {
    this.productsService.getProducts().subscribe({
      next: (list) => this.products.set(list.filter((p) => p.isActive)),
      error: () => this.products.set([]),
    });
  }

  readonly selectedProductName = computed(() => {
    const id = this.step3Product.getRawValue().productId;
    if (id < 1) return '';
    const p = this.products().find((x) => x.productId === id);
    return p ? (p.productName ?? p.productCode ?? String(id)) : '';
  });

  onPlanChange(): void {
    const id = this.step2.getRawValue().servicePlanId;
    if (id < 1) {
      this.planModules.set([]);
      this.step4ModuleIds.set(new Set());
      return;
    }
    const cc = this.step2.getRawValue().countryCode || 'AR';
    this.planService.getPlanModules(id, cc).subscribe({
      next: (list) => {
        this.planModules.set(list);
        const productId = this.step3Product.getRawValue().productId;
        if (productId < 1) {
          const enabled = new Set(list.filter((m) => m.enabled).map((m) => m.moduleId));
          this.step4ModuleIds.set(enabled);
        }
      },
    });
  }

  onProductChange(): void {
    const id = this.step3Product.getRawValue().productId;
    if (id < 1) {
      this.productModules.set([]);
      this.step4ModuleIds.set(new Set(this.enabledPlanModules().map((m) => m.moduleId)));
      return;
    }
    const cc = this.step2.getRawValue().countryCode || 'AR';
    this.productsService.getProductModules(id, cc).subscribe({
      next: (list) => {
        this.productModules.set(list);
        const enabled = new Set(list.filter((m) => m.enabled).map((m) => m.moduleId));
        this.step4ModuleIds.set(enabled);
      },
    });
  }

  toggleModule(moduleId: number): void {
    const next = new Set(this.step4ModuleIds());
    if (next.has(moduleId)) next.delete(moduleId);
    else next.add(moduleId);
    this.step4ModuleIds.set(next);
  }

  isModuleSelected(moduleId: number): boolean {
    return this.step4ModuleIds().has(moduleId);
  }

  productDisplayName(product: Product): string {
    return product.productName ?? product.productCode ?? String(product.productId);
  }

  enabledPlanModules(): ServicePlanModule[] {
    return this.planModules().filter((mod) => mod.enabled);
  }

  buildPayload(): TenantOnboardingDto {
    const s1 = this.step1.getRawValue();
    const s2 = this.step2.getRawValue();
    const s5 = this.step5.getRawValue();
    return {
      tenant: { code: s1.tenantCode, name: s1.tenantName },
      servicePlanId: s2.servicePlanId,
      localization: {
        defaultLanguageCode: DEFAULT_LANGUAGE,
        timeZone: DEFAULT_TIMEZONE,
        currencyCode: DEFAULT_CURRENCY,
        countryCode: s2.countryCode,
      },
      modules: Array.from(this.step4ModuleIds()),
      admin: {
        fullName: s5.adminName,
        email: s5.adminEmail,
        password: s5.adminPassword,
        sendInvitation: s5.sendInvitationEmail,
      },
    };
  }

  submit(): void {
    if (this.step1.invalid || this.step2.invalid || this.step5.invalid) return;
    this.submitting.set(true);
    this.error.set(null);
    const payload = this.buildPayload();
    this.tenantService.createTenantOnboarding(payload).subscribe({
      next: (res) => {
        const tenantId = res.tenant?.id != null ? Number(res.tenant.id) : null;
        if (this.createApiKey() && tenantId != null) {
          this.tenantService
            .createTenantApiKey(tenantId, 'Default API Key')
            .subscribe({
              next: () => {},
              error: () => {},
            });
        }
        this.submitting.set(false);
        this.success.set({
          tenantCode: res.tenant?.code ?? this.step1.getRawValue().tenantCode,
          tenantName: res.tenant?.name ?? this.step1.getRawValue().tenantName,
        });
      },
      error: (err) => {
        this.submitting.set(false);
        const body = err?.error;
        const msg =
          body?.error === 'plan_limit_reached'
            ? 'Plan limit reached.'
            : body?.error ?? err?.message ?? 'Error creating tenant';
        this.error.set(msg);
      },
    });
  }

  goToTenants(): void {
    void this.router.navigate([this.paths.tenants()]);
  }

  createAnother(): void {
    this.success.set(null);
    this.error.set(null);
    this.createApiKey.set(false);
    this.step1.reset({ tenantName: '', tenantCode: '' });
    this.step2.reset({ countryCode: 'AR', servicePlanId: 0 });
    this.step3Product.reset({ productId: 0 });
    this.step4ModuleIds.set(new Set());
    this.planModules.set([]);
    this.productModules.set([]);
    this.step5.reset({ adminName: '', adminEmail: '', adminPassword: '', sendInvitationEmail: true });
    this.stepper?.reset();
  }
}

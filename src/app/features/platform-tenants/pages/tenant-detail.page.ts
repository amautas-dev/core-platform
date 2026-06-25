import {
  ChangeDetectorRef,
  Component,
  inject,
  signal,
  OnInit,
  computed,
  DestroyRef,
  effect,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, distinctUntilChanged, filter, forkJoin, map, take } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router, NavigationEnd } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog } from '@angular/material/dialog';
import { TenantService } from '../services/tenant.service';
import { ApiService } from '../../../core/api/api.service';
import { PlatformRoutePathsService } from '../../../core/routing/platform-route-paths.service';
import type {
  TenantConsoleRoleRow,
  TenantEmailSmtpDto,
  TenantI18nOverrideRow,
  TenantMercadoPagoConfigDto,
  NotificacionesLicenseTermsDto,
  PutNotificacionesLicenseTermsDto,
} from '../services/tenant.service';
import { PlatformTenantRoleFeaturesDialogComponent } from '../components/platform-tenant-role-features-dialog.component';
import { PlatformTenantI18nOverrideDialogComponent } from '../components/platform-tenant-i18n-override-dialog.component';
import type { TenantDetail, TenantServiceSubscriptionLine } from '../models/tenant-detail.interface';
import type { ServicePlan } from '../models/service-plan.interface';
import { TenantFeature, TenantStandaloneFeature } from '../models/tenant-feature.interface';

/** Feature flags con etiqueta (Contrato y plan → capacidades). */
export interface TenantFeatureWithLabel extends TenantFeature {
  label: string;
}

const AVAILABLE_FEATURE_FLAGS: { code: string; label: string }[] = [
  { code: 'AI_REPORTS', label: 'AI Reports' },
  { code: 'BETA_DASHBOARD', label: 'Beta Dashboard' },
  { code: 'NEW_BILLING', label: 'New Billing' },
  { code: 'club.payments.online', label: 'Club — Pagos online (Mercado Pago)' },
];

/** Map tenant_audit_log action codes to i18n keys (activity.*). */
const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

const ACTIVITY_ACTION_KEYS: Record<string, string> = {
  'user.created': 'activity.userCreated',
  'user.updated': 'activity.userUpdated',
  'user.deleted': 'activity.userDeleted',
  'module.enabled': 'activity.moduleEnabled',
  'module.disabled': 'activity.moduleDisabled',
  'role.created': 'activity.roleCreated',
  'role.updated': 'activity.roleUpdated',
  'role.deleted': 'activity.roleDeleted',
  'tenant.updated': 'activity.tenantUpdated',
  'api_key.created': 'activity.apiKeyCreated',
  'api_key.deactivated': 'activity.apiKeyDeactivated',
  'webhook.created': 'activity.webhookCreated',
  'webhook.deactivated': 'activity.webhookDeactivated',
};

const DESKTOP_TELEMETRY_EVENT_KEYS: Record<string, string> = {
  'notificaciones.app.started': 'desktopTelemetry.appStarted',
  'notificaciones.license.applied': 'desktopTelemetry.licenseApplied',
  'notificaciones.auth.login.success': 'desktopTelemetry.loginSuccess',
  'notificaciones.auth.login.failed': 'desktopTelemetry.loginFailed',
  'notificaciones.import.csv.completed': 'desktopTelemetry.importCsv',
  'notificaciones.send.email.completed': 'desktopTelemetry.sendEmail',
  'notificaciones.send.email.failed': 'desktopTelemetry.sendEmailFailed',
  'notificaciones.send.whatsapp.completed': 'desktopTelemetry.sendWhatsapp',
  'notificaciones.send.whatsapp.failed': 'desktopTelemetry.sendWhatsappFailed',
  'notificaciones.campaign.created': 'desktopTelemetry.campaignCreated',
  'notificaciones.campaign.finished': 'desktopTelemetry.campaignFinished',
};
import type { TenantModule } from '../models/tenant-module.interface';
import { TenantUser } from '../models/tenant-user.interface';
import type { TenantRoleOption } from '../models/tenant-role-option.interface';
import { TenantAudit } from '../models/tenant-audit.interface';
import type { TenantUsage } from '../models/tenant-usage.interface';
import type { TenantActivityItem } from '../models/tenant-activity.interface';
import type { TenantDesktopTelemetryItem } from '../models/tenant-desktop-telemetry.interface';
import type { TenantApiKey } from '../models/tenant-api-key.interface';
import type { TenantWebhook } from '../models/tenant-webhook.interface';
import type {
  TenantLogoVariant,
  TenantThemeConfig,
  UpdateTenantThemePayload,
} from '../models/tenant-theme.interface';
import type { BrandingAssetsDto } from '../../../core/branding/branding.dto';
import { THEME_PALETTES, type ThemePalette } from '../../../shared/theming/theme-palettes';
import { buildAdvisorGeneratedPalette } from '../../../shared/theming/palette-assistant';
import { FONT_PRESETS } from '../../../shared/theming/font-presets';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MessageBoxService } from 'ui-kit';
import { HasPermissionDirective } from '../../../core/permissions/has-permission.directive';
import { PERMISSIONS } from '../../../core/permissions/permissions.const';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { TranslateService } from '@ngx-translate/core';
import { escapeHtml } from '../../../core/utils/escape-html.util';
import { CountriesService } from '../../platform-products/services/countries.service';
import type { CountryMarket } from '../../platform-products/models/country-market.interface';
import { ProductsService } from '../../platform-products/services/products.service';
import type { Product } from '../../platform-products/models/product.interface';
import { TenantThemeService } from '../../../core/theming/tenant-theme.service';
import { legacyColumnsFromTokens } from '../../../core/theming/branding-legacy';
import { BrandingAssetUploadComponent } from '../../../shared/components/branding-asset-upload/branding-asset-upload.component';
import { PlatformTenantUserPasswordDialogComponent } from '../components/platform-tenant-user-password-dialog.component';
import { PlatformTenantUserEditDialogComponent } from '../components/platform-tenant-user-edit-dialog.component';
import { TenantNotificationsGuidedComponent } from '../components/tenant-notifications-guided.component';

type TenantBrandingFileIdField =
  | 'logoFileId'
  | 'logoDarkFileId'
  | 'logoCompactFileId'
  | 'logoCompactDarkFileId'
  | 'faviconFileId'
  | 'loginBackgroundLightFileId'
  | 'loginBackgroundDarkFileId'
  | 'appBackgroundPatternFileId';

const TENANT_BRANDING_RESOLVED_SLOT: Record<
  TenantBrandingFileIdField,
  keyof Omit<BrandingAssetsDto, 'themeModeDefault'>
> = {
  logoFileId: 'logoFullLight',
  logoDarkFileId: 'logoFullDark',
  logoCompactFileId: 'logoCompactLight',
  logoCompactDarkFileId: 'logoCompactDark',
  faviconFileId: 'favicon',
  loginBackgroundLightFileId: 'loginBackgroundLight',
  loginBackgroundDarkFileId: 'loginBackgroundDark',
  appBackgroundPatternFileId: 'appBackgroundPattern',
};

@Component({
  selector: 'app-tenant-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatTabsModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatTableModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatMenuModule,
    MatExpansionModule,
    MatButtonToggleModule,
    MatTooltipModule,
    HasPermissionDirective,
    PlatformTranslatePipe,
    BrandingAssetUploadComponent,
    TenantNotificationsGuidedComponent,
  ],
  templateUrl: './tenant-detail.page.html',
  styleUrls: ['./tenant-detail.page.scss'],
})
export class TenantDetailPage implements OnInit {
  private readonly tenantService = inject(TenantService);
  private readonly api = inject(ApiService);
  private readonly countriesService = inject(CountriesService);
  private readonly productsService = inject(ProductsService);
  private readonly tenantThemeSvc = inject(TenantThemeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly paths = inject(PlatformRoutePathsService);
  private readonly msgBox = inject(MessageBoxService);
  private readonly translate = inject(TranslateService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly tenant = signal<TenantDetail | null>(null);
  /** Features de catálogo sin módulo (pestaña Funcionalidades → «Otras funcionalidades»). */
  readonly standaloneFeatures = signal<TenantStandaloneFeature[]>([]);
  readonly standaloneFeaturesLoading = signal(false);
  readonly standaloneFeatureToggling = signal<string | null>(null);
  /** Lista fija de flags para la tarjeta «Capacidades» (merge con API). */
  readonly tenantFeatures = signal<TenantFeatureWithLabel[]>([]);
  readonly featuresLoading = signal(false);
  readonly featuresSaving = signal(false);
  readonly modules = signal<TenantModule[]>([]);
  readonly tenantUsers = signal<TenantUser[]>([]);
  /** Roles del tenant (selector al crear usuario). */
  readonly tenantRoles = signal<TenantRoleOption[]>([]);
  readonly creatingTenantUser = signal(false);
  readonly userTogglingId = signal<number | null>(null);

  readonly tenantUserTableColumns = [
    'username',
    'email',
    'role',
    'status',
    'password',
    'activeToggle',
    'actions',
  ];
  readonly newUserEmail = signal('');
  readonly newUserFirstName = signal('');
  readonly newUserPassword = signal('');
  /** role_id como string (BigInt en API). */
  readonly newUserRoleId = signal<string | null>(null);
  readonly tenantAudit = signal<TenantAudit[]>([]);
  readonly plans = signal<ServicePlan[]>([]);
  readonly countries = signal<CountryMarket[]>([]);
  readonly planNameById = signal<Record<number, string>>({});
  readonly loading = signal(true);
  readonly modulesLoading = signal(false);
  readonly provisioningLoading = signal(false);
  readonly usersLoading = signal(false);
  readonly auditLoading = signal(false);
  readonly plansLoading = signal(false);
  readonly planUpdating = signal(false);
  /** Incluir planes inactivos (is_active = false) en los desplegables de plan. */
  readonly showInactivePlans = signal(false);
  readonly selectedPlanId = signal<number | null>(null);
  /** Catálogo de productos (para agregar otra línea de suscripción al tenant). */
  readonly catalogProducts = signal<Product[]>([]);
  readonly catalogProductsLoading = signal(false);
  /** Producto y plan elegidos en «Agregar producto» (suscripción adicional). */
  readonly addSubscriptionProductId = signal<number | null>(null);
  readonly addSubscriptionPlanId = signal<number | null>(null);
  /** servicePlanId elegido por productId (selector resumen). */
  readonly planSelectionByProduct = signal<Record<number, number>>({});
  readonly tenantUsage = signal<TenantUsage | null>(null);
  readonly moduleTogglingId = signal<number | null>(null);
  readonly addonTogglingId = signal<number | null>(null);
  readonly usageLoading = signal(false);
  readonly error = signal<string | null>(null);
  readonly actionPending = signal(false);
  readonly apiKeys = signal<TenantApiKey[]>([]);
  readonly apiKeysLoading = signal(false);
  readonly creatingApiKey = signal(false);
  readonly newApiKeyName = signal('');
  readonly tenantWebhooks = signal<TenantWebhook[]>([]);
  readonly webhooksLoading = signal(false);
  readonly creatingWebhook = signal(false);
  readonly newWebhookUrl = signal('');
  readonly activity = signal<TenantActivityItem[]>([]);
  readonly activityLoading = signal(false);
  readonly desktopTelemetry = signal<TenantDesktopTelemetryItem[]>([]);
  readonly desktopTelemetryLoading = signal(false);
  readonly tenantTheme = signal<TenantThemeConfig | null>(null);
  readonly themeLoading = signal(false);
  readonly themeSaving = signal(false);
  readonly themePalettes = THEME_PALETTES;
  readonly selectedTenantPaletteId = signal<string | null>(null);
  /** Misma UX que `settings.page` (Configuración global): asistente + paletas + formulario reactivo. */
  readonly showPaletteTools = signal(false);
  readonly advisorColor1 = signal('#0FA2CC');
  readonly advisorColor2 = signal('');
  readonly advisorColor3 = signal('');
  readonly paletteRecommendations = signal<ThemePalette[]>([]);
  readonly fontPresets = FONT_PRESETS;
  readonly selectedFontPresetId = signal<string>('custom');

  /** Vista previa identidad (mock login): modo claro u oscuro. */
  readonly brandPreviewMode = signal<'light' | 'dark'>('light');
  private readonly assetCacheBuster = signal(0);

  /** Consola tenant: menú lateral plano para no admin (tenant_setting). */
  readonly consoleSidebarFlatten = signal<boolean | null>(null);
  readonly consoleSidebarLoading = signal(false);
  readonly consoleSidebarSaving = signal(false);
  readonly consoleRoles = signal<TenantConsoleRoleRow[]>([]);
  readonly consoleRolesLoading = signal(false);
  readonly tenantI18nOverrides = signal<TenantI18nOverrideRow[]>([]);
  readonly tenantI18nOverridesLoading = signal(false);

  readonly tenantSmtpLoading = signal(false);
  readonly tenantSmtpSaving = signal(false);
  readonly tenantSmtpSnapshot = signal<TenantEmailSmtpDto | null>(null);

  readonly tenantSmtpForm = this.fb.nonNullable.group({
    useCustomSmtp: [false],
    host: [''],
    port: [587, [Validators.min(1), Validators.max(65535)]],
    secure: [false],
    user: [''],
    pass: [''],
    from: [''],
    clearStoredPassword: [false],
  });

  readonly tenantMpLoading = signal(false);
  readonly tenantMpSaving = signal(false);
  readonly tenantMpSnapshot = signal<TenantMercadoPagoConfigDto | null>(null);
  readonly tenantMpForm = this.fb.nonNullable.group({
    accessToken: [''],
    sandbox: [true],
    isEnabled: [false],
  });

  readonly notifLicenseTermsLoading = signal(false);
  readonly notifLicenseSaving = signal(false);
  readonly notifLicenseTerms = signal<NotificacionesLicenseTermsDto | null>(null);
  readonly enabledNotifMessageTypeCount = signal(0);

  readonly notifLicenseForm = this.fb.nonNullable.group({
    licenseKind: ['perpetual', Validators.required],
    maxDevices: [1, [Validators.required, Validators.min(1)]],
    devicesUnlimited: [true],
    maxMessageTypes: [1, [Validators.required, Validators.min(1)]],
    messageTypesUnlimited: [true],
    priceAmount: [390000, [Validators.required, Validators.min(0)]],
    currencyCode: ['ARS', [Validators.required, Validators.maxLength(10)]],
    priceOverrideReason: [''],
    validFrom: [''],
    validUntil: [''],
    notes: [''],
  });

  /** Código y nombre de empresa (pestaña Resumen, modo edición). */
  readonly tenantSummaryForm = this.fb.nonNullable.group({
    tenantCode: ['', [Validators.required, Validators.minLength(2)]],
    tenantName: ['', [Validators.required, Validators.minLength(2)]],
  });
  readonly summarySaving = signal(false);

  readonly tenantBrandingForm = this.fb.nonNullable.group({
    primaryColor: ['#1f6feb', Validators.pattern(HEX_PATTERN)],
    accentColor: ['#4dd2f0', Validators.pattern(HEX_PATTERN)],
    buttonCancelColor: ['#5f6b7a', Validators.pattern(HEX_PATTERN)],
    fontFamily: [''],
    headingFontFamily: [''],
    baseFontSize: [16 as number | string],
    logoFileId: [null as string | null],
    logoDarkFileId: [null as string | null],
    logoCompactFileId: [null as string | null],
    logoCompactDarkFileId: [null as string | null],
    faviconFileId: [null as string | null],
    loginBackgroundLightFileId: [null as string | null],
    loginBackgroundDarkFileId: [null as string | null],
    appBackgroundPatternFileId: [null as string | null],
    loginBackgroundUrl: [''],
    themeModeDefault: ['light' as 'light' | 'dark' | 'auto' | 'system'],
    logoSlotSidebar: ['primary' as TenantLogoVariant],
    logoSlotLogin: ['primary' as TenantLogoVariant],
    logoSlotFavicon: ['primary' as TenantLogoVariant],
    logoSlotSidebarCollapsed: ['primary' as TenantLogoVariant],
    companyDisplayName: [''],
  });

  readonly tenantId = computed(() => this.tenant()?.tenantId ?? null);

  /**
   * Producto/módulo Notificaciones: pestaña y licencia si está en plan, add-on o activo en tenant.
   * (Antes solo `effectiveEnabled`; quedaba oculto si el catálogo mostría plan pero el flag aún no coincidía.)
   */
  readonly hasNotificationsModule = computed(() =>
    this.modules().some((m) => this.notificacionesLicenseEntitled(m)),
  );

  /** Fila del catálogo de módulos: puede generar/descargar licencia desktop. */
  notificacionesLicenseEntitled(m: TenantModule): boolean {
    if (String(m.moduleCode || '').toLowerCase() !== 'notificaciones') return false;
    return Boolean(m.effectiveEnabled || m.planEnabled || m.fromAddon);
  }

  readonly planDisplayName = computed(() => {
    const t = this.tenant();
    if (!t) return '';
    const catalog = this.planNameById()[t.servicePlanId];
    if (catalog) return catalog;
    return t.planName ?? String(t.servicePlanId);
  });

  /** Productos activos que aún no tienen línea en el tenant y tienen al menos un plan regional cargado. */
  readonly productsAvailableToSubscribe = computed(() => {
    const t = this.tenant();
    const subIds = new Set(
      (t?.serviceSubscriptions ?? [])
        .map((s) => s.productId)
        .filter((x): x is number => x != null),
    );
    const planProductIds = new Set(
      this.plans().map((p) => p.productId).filter((x): x is number => x != null),
    );
    return this.catalogProducts().filter(
      (p) => p.isActive && !subIds.has(p.productId) && planProductIds.has(p.productId),
    );
  });

  readonly addSubscriptionPlanOptions = computed(() => {
    const pid = this.addSubscriptionProductId();
    if (pid == null) return [];
    return this.plans().filter((p) => p.productId === pid);
  });

  readonly logoSlotOptions: { value: TenantLogoVariant; labelKey: string }[] = [
    { value: 'primary', labelKey: 'tenants.logoVariantPrimary' },
    { value: 'alternate', labelKey: 'tenants.logoVariantAlternate' },
    { value: 'primary_reduced', labelKey: 'tenants.logoVariantPrimaryReduced' },
    { value: 'alternate_reduced', labelKey: 'tenants.logoVariantAlternateReduced' },
  ];

  readonly PERMISSIONS = PERMISSIONS;

  /**
   * Vista `/tenants/:id`: solo lectura (sin mutaciones en UI).
   * Edición `/tenants/:id/edit`: requiere `tenants.update` (guard) y habilita cambios.
   */
  readonly readonlyMode = signal(true);

  constructor() {
    effect(() => {
      const ro = this.readonlyMode();
      untracked(() => {
        for (const f of [
          this.tenantSummaryForm,
          this.tenantBrandingForm,
          this.tenantSmtpForm,
          this.tenantMpForm,
          this.notifLicenseForm,
        ]) {
          if (ro) {
            f.disable({ emitEvent: false });
          } else {
            f.enable({ emitEvent: false });
          }
        }
      });
    });
  }

  private syncReadonlyFromUrl(): void {
    const path = this.router.url.split('?')[0].replace(/\/$/, '');
    const isEdit = path.endsWith('/edit') || path.endsWith('/editar');
    this.readonlyMode.set(!isEdit);
  }

  /** Id numérico del segmento `:id` actual (null si inválido). */
  private routeTenantId(): number | null {
    const raw = this.route.snapshot.paramMap.get('id');
    if (!raw) return null;
    const n = parseInt(raw, 10);
    return Number.isNaN(n) ? null : n;
  }

  /** Descarta respuestas HTTP de un tenant anterior tras cambiar de ruta sin recrear el componente. */
  private isStaleTenantResponse(expectedTenantId: number): boolean {
    return this.routeTenantId() !== expectedTenantId;
  }

  /**
   * Limpia el formulario de marca antes de cargar el siguiente tenant; evita mezclar fileIds / previews
   * entre empresas al navegar solo con `:id`.
   */
  private resetTenantBrandingFormForNavigation(): void {
    this.tenantBrandingForm.reset(
      {
        primaryColor: '#1f6feb',
        accentColor: '#4dd2f0',
        buttonCancelColor: '#5f6b7a',
        fontFamily: '',
        headingFontFamily: '',
        baseFontSize: 16,
        logoFileId: null,
        logoDarkFileId: null,
        logoCompactFileId: null,
        logoCompactDarkFileId: null,
        faviconFileId: null,
        loginBackgroundLightFileId: null,
        loginBackgroundDarkFileId: null,
        appBackgroundPatternFileId: null,
        loginBackgroundUrl: '',
        themeModeDefault: 'light',
        logoSlotSidebar: 'primary',
        logoSlotLogin: 'primary',
        logoSlotFavicon: 'primary',
        logoSlotSidebarCollapsed: 'primary',
        companyDisplayName: '',
      },
      { emitEvent: false },
    );
    this.syncFontPresetFromForm();
    this.selectedTenantPaletteId.set(null);
    this.brandPreviewMode.set('light');
  }

  private onTenantRouteId(tenantId: number): void {
    this.error.set(null);
    this.tenant.set(null);
    this.tenantTheme.set(null);
    this.resetTenantBrandingFormForNavigation();
    this.assetCacheBuster.update((n) => n + 1);

    this.loadTenant(tenantId);
    this.loadTenantFeatureFlags(tenantId);
    this.loadFeatures(tenantId);
    this.loadModules(tenantId);
    this.loadUsers(tenantId);
    this.loadAudit(tenantId);
    this.loadUsage(tenantId);
    this.loadApiKeys(tenantId);
    this.loadWebhooks(tenantId);
    this.loadActivity(tenantId);
    this.loadDesktopTelemetry(tenantId);
    this.loadTenantTheme(tenantId);
    this.loadConsoleSidebar(tenantId);
    this.loadConsoleRoles(tenantId);
    this.loadTenantI18nOverrides(tenantId);
    this.loadTenantEmailSmtp(tenantId);
    this.loadTenantMercadoPago(tenantId);
  }

  ngOnInit(): void {
    this.syncReadonlyFromUrl();
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.syncReadonlyFromUrl());

    this.countriesService.list().pipe(take(1), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (list) => this.countries.set(list),
      error: () => this.countries.set([]),
    });

    this.loadCatalogProducts();

    this.route.paramMap
      .pipe(
        map((pm) => pm.get('id')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((rawId) => {
        if (!rawId) {
          this.loading.set(false);
          this.error.set('Tenant no especificado');
          return;
        }
        const numId = parseInt(rawId, 10);
        if (Number.isNaN(numId)) {
          this.loading.set(false);
          this.error.set('ID de tenant inválido');
          return;
        }
        this.onTenantRouteId(numId);
      });

    this.tenantBrandingForm.controls.fontFamily.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFontPresetFromForm());
    this.recomputeRecommendations();
  }

  private loadCatalogProducts(): void {
    this.catalogProductsLoading.set(true);
    this.productsService.getProducts().subscribe({
      next: (list) => {
        this.catalogProducts.set((list ?? []).filter((p) => p.isActive));
        this.catalogProductsLoading.set(false);
      },
      error: () => {
        this.catalogProducts.set([]);
        this.catalogProductsLoading.set(false);
      },
    });
  }

  private loadServicePlans(countryCode: string, tenantNumericId?: number): void {
    this.plansLoading.set(true);
    const tid = tenantNumericId ?? this.tenantId() ?? undefined;
    this.tenantService
      .getServicePlans({
        country: countryCode,
        tenantId: tid,
        includeInactive: this.showInactivePlans() || undefined,
      })
      .subscribe({
        next: (plans) => {
          this.plans.set(plans);
          const map: Record<number, string> = {};
          plans.forEach((p) => (map[p.servicePlanId] = p.servicePlanName ?? p.planName ?? ''));
          this.planNameById.set(map);
          this.plansLoading.set(false);
          this.syncAddSubscriptionSelectionAfterPlansLoad();
        },
        error: () => this.plansLoading.set(false),
      });
  }

  onShowInactivePlansChange(checked: boolean): void {
    this.showInactivePlans.set(checked);
    const t = this.tenant();
    if (!t) return;
    this.loadServicePlans(t.countryCode ?? 'AR', t.tenantId);
  }

  /** Si el producto elegido para «Agregar» ya no está disponible o el plan dejó de existir, alinear selección. */
  private syncAddSubscriptionSelectionAfterPlansLoad(): void {
    const pid = this.addSubscriptionProductId();
    if (pid == null) return;
    const available = this.productsAvailableToSubscribe();
    if (!available.some((p) => p.productId === pid)) {
      this.addSubscriptionProductId.set(null);
      this.addSubscriptionPlanId.set(null);
      return;
    }
    const opts = this.plans().filter((p) => p.productId === pid);
    if (opts.length === 0) {
      this.addSubscriptionPlanId.set(null);
      return;
    }
    const curPlan = this.addSubscriptionPlanId();
    if (curPlan == null) {
      if (opts.length === 1) this.addSubscriptionPlanId.set(opts[0].servicePlanId);
      return;
    }
    if (!opts.some((p) => p.servicePlanId === curPlan)) {
      this.addSubscriptionPlanId.set(opts.length === 1 ? opts[0].servicePlanId : null);
    }
  }

  productCatalogLabel(p: Product): string {
    const name = (p.productName ?? '').trim();
    const code = (p.productCode ?? '').trim();
    if (name && code) return `${name} (${code})`;
    return name || code || `#${p.productId}`;
  }

  onAddSubscriptionProductChange(productId: number | null): void {
    this.addSubscriptionProductId.set(productId);
    if (productId == null) {
      this.addSubscriptionPlanId.set(null);
      return;
    }
    const opts = this.plans().filter((p) => p.productId === productId);
    this.addSubscriptionPlanId.set(opts.length === 1 ? opts[0].servicePlanId : null);
  }

  onAddSubscriptionPlanChange(servicePlanId: number | null): void {
    this.addSubscriptionPlanId.set(servicePlanId);
  }

  applyAddProductSubscription(): void {
    const id = this.tenantId();
    const productId = this.addSubscriptionProductId();
    const servicePlanId = this.addSubscriptionPlanId();
    if (id === null || productId == null || servicePlanId == null) return;
    this.planUpdating.set(true);
    this.error.set(null);
    this.tenantService.changeTenantPlan(id, servicePlanId, productId).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.syncPlanSelectionsFromTenant(updated);
        this.selectedPlanId.set(updated.servicePlanId ?? null);
        this.addSubscriptionProductId.set(null);
        this.addSubscriptionPlanId.set(null);
        this.loadModules(updated.tenantId);
        this.planUpdating.set(false);
      },
      error: (err) => {
        this.planUpdating.set(false);
        const msg =
          typeof err?.error?.error === 'string'
            ? err.error.error
            : typeof err?.error?.message === 'string'
              ? err.error.message
              : err?.message;
        this.error.set(msg ?? this.translate.instant('tenants.addProductSubscribeError'));
      },
    });
  }

  saveTenantSummary(): void {
    if (this.tenantSummaryForm.invalid) return;
    const id = this.tenantId();
    if (id === null) return;
    const { tenantCode, tenantName } = this.tenantSummaryForm.getRawValue();
    this.summarySaving.set(true);
    this.error.set(null);
    this.tenantService
      .updateTenant(id, {
        tenantCode: tenantCode.trim(),
        tenantName: tenantName.trim(),
      })
      .subscribe({
        next: () => {
          this.summarySaving.set(false);
          this.loadTenant(id);
        },
        error: (err) => {
          this.summarySaving.set(false);
          this.error.set(err?.message ?? err?.error?.error ?? 'Error al guardar datos de la empresa');
        },
      });
  }

  onTenantCountryChange(countryCode: string): void {
    const id = this.tenantId();
    if (id === null) return;
    this.actionPending.set(true);
    this.error.set(null);
    this.tenantService.updateTenant(id, { countryCode }).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.loadTenant(id);
      },
      error: (err) => {
        this.actionPending.set(false);
        this.error.set(err?.message ?? 'Error al actualizar país');
      },
    });
  }

  hostingDeploymentLabel(value: string | null | undefined): string {
    const v = value ?? 'amautas';
    return v === 'external'
      ? this.translate.instant('tenants.hostingExternal')
      : this.translate.instant('tenants.hostingAmautas');
  }

  onHostingDeploymentChange(value: 'amautas' | 'external'): void {
    const id = this.tenantId();
    if (id === null) return;
    this.actionPending.set(true);
    this.error.set(null);
    this.tenantService.updateTenant(id, { hostingDeployment: value }).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.loadTenant(id);
      },
      error: (err) => {
        this.actionPending.set(false);
        this.error.set(err?.message ?? 'Error al actualizar despliegue');
      },
    });
  }

  getServicePlanName(servicePlanId: number): string {
    return this.planNameById()[servicePlanId] ?? String(servicePlanId);
  }

  /**
   * Mismo nombre comercial que el desplegable (catálogo regional). `planName` del API viene del
   * registro base en BD (p. ej. código interno «Starter») y puede no coincidir con la etiqueta del catálogo («Básico»).
   */
  subscriptionPlanCatalogLabel(line: TenantServiceSubscriptionLine): string {
    const id = line.servicePlanId;
    if (id != null) {
      const fromMap = this.planNameById()[id];
      if (fromMap) return fromMap;
      const p = this.plans().find((sp) => sp.servicePlanId === id);
      if (p) return p.servicePlanName ?? p.planName ?? '';
    }
    return line.planName ?? '—';
  }

  private loadConsoleSidebar(tenantId: number): void {
    this.consoleSidebarLoading.set(true);
    this.tenantService.getTenantConsoleSidebar(tenantId).subscribe({
      next: (r) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.consoleSidebarFlatten.set(r.flattenGroupsForNonAdmin);
        this.consoleSidebarLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.consoleSidebarFlatten.set(null);
        this.consoleSidebarLoading.set(false);
      },
    });
  }

  private loadConsoleRoles(tenantId: number): void {
    this.consoleRolesLoading.set(true);
    this.tenantService.listTenantConsoleRoles(tenantId).subscribe({
      next: (r) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.consoleRoles.set(r.items ?? []);
        this.consoleRolesLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.consoleRoles.set([]);
        this.consoleRolesLoading.set(false);
      },
    });
  }

  private loadTenantI18nOverrides(tenantId: number): void {
    this.tenantI18nOverridesLoading.set(true);
    this.tenantService.listTenantI18nOverrides(tenantId).subscribe({
      next: (r) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantI18nOverrides.set(r.items ?? []);
        this.tenantI18nOverridesLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantI18nOverrides.set([]);
        this.tenantI18nOverridesLoading.set(false);
      },
    });
  }

  openConsoleRoleFeaturesDialog(role: TenantConsoleRoleRow): void {
    const tid = this.tenantId();
    if (tid == null) return;
    this.dialog
      .open(PlatformTenantRoleFeaturesDialogComponent, {
        width: 'min(800px, 96vw)',
        maxHeight: '90vh',
        autoFocus: 'dialog',
        data: { tenantId: tid, role },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.loadConsoleRoles(tid);
      });
  }

  openTenantI18nCreateDialog(): void {
    const tid = this.tenantId();
    if (tid == null) return;
    this.dialog
      .open(PlatformTenantI18nOverrideDialogComponent, {
        width: 'min(480px, 94vw)',
        data: { tenantId: tid, existing: null },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.loadTenantI18nOverrides(tid);
      });
  }

  openTenantI18nEditDialog(row: TenantI18nOverrideRow): void {
    const tid = this.tenantId();
    if (tid == null) return;
    this.dialog
      .open(PlatformTenantI18nOverrideDialogComponent, {
        width: 'min(480px, 94vw)',
        data: { tenantId: tid, existing: row },
      })
      .afterClosed()
      .subscribe((saved) => {
        if (saved) this.loadTenantI18nOverrides(tid);
      });
  }

  async onConsoleSidebarFlattenChange(checked: boolean): Promise<void> {
    const id = this.tenantId();
    if (id == null) return;
    this.consoleSidebarSaving.set(true);
    this.tenantService.updateTenantConsoleSidebar(id, { flattenGroupsForNonAdmin: checked }).subscribe({
      next: (r) => {
        this.consoleSidebarFlatten.set(r.flattenGroupsForNonAdmin);
        this.consoleSidebarSaving.set(false);
      },
      error: async (err) => {
        this.consoleSidebarSaving.set(false);
        const raw = err?.error?.error ?? err?.message ?? 'Error';
        await this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: `<p>${escapeHtml(String(raw))}</p>`,
          confirm: false,
        });
        this.loadConsoleSidebar(id);
      },
    });
  }

  private loadTenantEmailSmtp(tenantId: number): void {
    this.tenantSmtpLoading.set(true);
    this.tenantService.getTenantEmailSmtp(tenantId).subscribe({
      next: (dto) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantSmtpSnapshot.set(dto);
        this.tenantSmtpForm.patchValue({
          useCustomSmtp: dto.useCustomSmtp,
          host: dto.host ?? '',
          port: dto.port ?? 587,
          secure: dto.secure ?? false,
          user: dto.user ?? '',
          from: dto.from ?? '',
          pass: '',
          clearStoredPassword: false,
        });
        this.tenantSmtpLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantSmtpSnapshot.set(null);
        this.tenantSmtpLoading.set(false);
      },
    });
  }

  private loadTenantMercadoPago(tenantId: number): void {
    this.tenantMpLoading.set(true);
    this.tenantService.getTenantMercadoPago(tenantId).subscribe({
      next: (dto) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantMpSnapshot.set(dto);
        this.tenantMpForm.patchValue({
          accessToken: '',
          sandbox: dto.sandbox !== false,
          isEnabled: dto.isEnabled === true,
        });
        this.tenantMpLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantMpSnapshot.set(null);
        this.tenantMpLoading.set(false);
      },
    });
  }

  saveTenantMercadoPago(): void {
    const id = this.tenantId();
    if (id == null) return;
    const raw = this.tenantMpForm.getRawValue();
    if (raw.isEnabled && !String(raw.accessToken || '').trim() && !this.tenantMpSnapshot()?.tokenConfigured) {
      void this.msgBox.show({
        title: this.translate.instant('common.error'),
        html: `<p>${escapeHtml(this.translate.instant('tenants.mercadoPagoTokenRequired'))}</p>`,
        confirm: false,
      });
      return;
    }
    this.tenantMpSaving.set(true);
    const body: { accessToken?: string; sandbox: boolean; isEnabled: boolean } = {
      sandbox: !!raw.sandbox,
      isEnabled: !!raw.isEnabled,
    };
    if (String(raw.accessToken || '').trim()) {
      body.accessToken = String(raw.accessToken).trim();
    }
    this.tenantService.putTenantMercadoPago(id, body).subscribe({
      next: (dto) => {
        this.tenantMpSnapshot.set(dto);
        this.tenantMpForm.patchValue({ accessToken: '' });
        this.tenantMpSaving.set(false);
      },
      error: async (err) => {
        this.tenantMpSaving.set(false);
        const rawErr = err?.error?.error ?? err?.message ?? 'Error';
        await this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: `<p>${escapeHtml(String(rawErr))}</p>`,
          confirm: false,
        });
      },
    });
  }

  saveTenantEmailSmtp(): void {
    const id = this.tenantId();
    if (id == null) return;
    const raw = this.tenantSmtpForm.getRawValue();
    if (raw.useCustomSmtp && !String(raw.host || '').trim()) {
      void this.msgBox.show({
        title: this.translate.instant('common.error'),
        html: `<p>${escapeHtml(this.translate.instant('tenants.emailSmtpHostRequired'))}</p>`,
        confirm: false,
      });
      return;
    }
    this.tenantSmtpSaving.set(true);
    const body: {
      useCustomSmtp: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      from: string;
      pass?: string;
      clearPassword?: boolean;
    } = {
      useCustomSmtp: raw.useCustomSmtp,
      host: String(raw.host || '').trim(),
      port: Number(raw.port) || 587,
      secure: !!raw.secure,
      user: String(raw.user || '').trim(),
      from: String(raw.from || '').trim(),
    };
    if (String(raw.pass || '').trim()) {
      body.pass = String(raw.pass).trim();
    }
    if (raw.clearStoredPassword) {
      body.clearPassword = true;
    }
    this.tenantService.putTenantEmailSmtp(id, body).subscribe({
      next: (dto) => {
        this.tenantSmtpSnapshot.set(dto);
        this.tenantSmtpForm.patchValue({ pass: '', clearStoredPassword: false });
        this.tenantSmtpSaving.set(false);
      },
      error: async (err) => {
        this.tenantSmtpSaving.set(false);
        const rawErr = err?.error?.error ?? err?.message ?? 'Error';
        await this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: `<p>${escapeHtml(String(rawErr))}</p>`,
          confirm: false,
        });
      },
    });
  }

  private syncPlanSelectionsFromTenant(t: TenantDetail): void {
    const m: Record<number, number> = {};
    for (const line of t.serviceSubscriptions ?? []) {
      if (line.productId != null && line.servicePlanId != null) {
        m[line.productId] = line.servicePlanId;
      }
    }
    this.planSelectionByProduct.set(m);
  }

  /** Planes del catálogo filtrados por línea de producto (fallback: todos si la API no envía productId). */
  plansForProduct(productId: number | null | undefined): ServicePlan[] {
    const all = this.plans();
    if (productId == null) return all;
    const filtered = all.filter((p) => p.productId === productId);
    return filtered.length > 0 ? filtered : all;
  }

  planOptionLabel(p: ServicePlan): string {
    const name = p.planName ?? p.servicePlanName ?? String(p.servicePlanId);
    if (p.price != null && p.currency) {
      return `${name} (${p.price} ${p.currency})`;
    }
    return name;
  }

  selectedPlanForLine(line: TenantServiceSubscriptionLine): number {
    const pid = line.productId;
    if (pid == null) return line.servicePlanId ?? 0;
    return this.planSelectionByProduct()[pid] ?? line.servicePlanId ?? 0;
  }

  onProductPlanSelect(productId: number | null | undefined, servicePlanId: number): void {
    if (productId == null) return;
    this.planSelectionByProduct.update((prev) => ({ ...prev, [productId]: servicePlanId }));
  }

  applyPlanChangeForProduct(productId: number | null | undefined): void {
    const id = this.tenantId();
    if (id === null || productId == null) return;
    const servicePlanId = this.planSelectionByProduct()[productId];
    if (servicePlanId == null) return;
    this.planUpdating.set(true);
    this.error.set(null);
    this.tenantService.changeTenantPlan(id, servicePlanId, productId).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.syncPlanSelectionsFromTenant(updated);
        this.selectedPlanId.set(updated.servicePlanId ?? null);
        this.loadModules(updated.tenantId);
        this.planUpdating.set(false);
      },
      error: (err) => {
        this.planUpdating.set(false);
        const msg =
          typeof err?.error?.error === 'string'
            ? err.error.error
            : typeof err?.error?.message === 'string'
              ? err.error.message
              : err?.message;
        this.error.set(msg ?? this.translate.instant('tenants.changePlanError'));
      },
    });
  }

  async confirmUnsubscribeProductLine(line: TenantServiceSubscriptionLine): Promise<void> {
    if (line.productId == null || this.readonlyMode()) return;
    const labelRaw = line.productName || line.productCode || `#${line.productId}`;
    const productSafe = escapeHtml(labelRaw);
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('tenants.unsubscribeProductConfirmTitle'),
      html: `<p>${this.translate.instant('tenants.unsubscribeProductConfirmHtml', { product: productSafe })}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    const id = this.tenantId();
    if (id === null) return;
    this.planUpdating.set(true);
    this.error.set(null);
    this.tenantService.endProductSubscription(id, line.productId).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.syncPlanSelectionsFromTenant(updated);
        this.selectedPlanId.set(updated.servicePlanId ?? null);
        this.addSubscriptionProductId.set(null);
        this.addSubscriptionPlanId.set(null);
        this.loadModules(updated.tenantId);
        this.planUpdating.set(false);
      },
      error: (err) => {
        this.planUpdating.set(false);
        const code = err?.error?.error;
        const msg =
          code === 'no_open_subscription_for_product'
            ? this.translate.instant('tenants.unsubscribeProductNoSubscription')
            : typeof code === 'string'
              ? code
              : typeof err?.error?.message === 'string'
                ? err.error.message
                : err?.message;
        this.error.set(msg ?? this.translate.instant('tenants.unsubscribeProductError'));
      },
    });
  }

  private loadTenant(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.tenantService.getTenantDetail(id).subscribe({
      next: (t) => {
        if (this.isStaleTenantResponse(id)) return;
        this.tenant.set(t);
        this.tenantSummaryForm.patchValue(
          { tenantCode: t.tenantCode ?? '', tenantName: t.tenantName ?? '' },
          { emitEvent: false },
        );
        this.selectedPlanId.set(t.servicePlanId ?? null);
        this.syncPlanSelectionsFromTenant(t);
        this.loadServicePlans(t.countryCode ?? 'AR', t.tenantId);
        this.loadTenantRoles(id);
        this.loading.set(false);
      },
      error: (err) => {
        if (this.isStaleTenantResponse(id)) return;
        this.error.set(err?.message ?? 'Error al cargar tenant');
        this.loading.set(false);
      },
    });
  }


  private loadFeatures(id: number): void {
    this.featuresLoading.set(true);
    this.tenantService.getTenantFeatures(id).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(id)) return;
        const merged: TenantFeatureWithLabel[] = AVAILABLE_FEATURE_FLAGS.map((af) => ({
          featureCode: af.code,
          enabled: list.find((f) => f.featureCode === af.code)?.enabled ?? false,
          label: af.label,
        }));
        this.tenantFeatures.set(merged);
        this.featuresLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(id)) return;
        this.featuresLoading.set(false);
      },
    });
  }

  private refreshFeatureLists(id: number): void {
    this.tenantService.getTenantStandaloneFeatures(id).subscribe({
      next: (standalone) => this.standaloneFeatures.set(standalone),
    });
  }

  private loadTenantFeatureFlags(id: number): void {
    this.standaloneFeaturesLoading.set(true);
    this.tenantService.getTenantStandaloneFeatures(id).subscribe({
      next: (standalone) => {
        if (this.isStaleTenantResponse(id)) return;
        this.standaloneFeatures.set(standalone);
        this.standaloneFeaturesLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(id)) return;
        this.standaloneFeaturesLoading.set(false);
      },
    });
  }

  private loadModules(id: number): void {
    this.modulesLoading.set(true);
    this.tenantService.getTenantModules(id).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(id)) return;
        this.modules.set(
          list.map((m) => ({
            ...m,
            fromAddon: m.fromAddon ?? false,
            effectiveEnabled: m.effectiveEnabled ?? m.tenantEnabled,
            editable: m.editable ?? false,
          })),
        );
        this.modulesLoading.set(false);
        const hasNotif = list.some((m) => {
          if (String(m.moduleCode || '').toLowerCase() !== 'notificaciones') return false;
          const eff = Boolean(m.effectiveEnabled ?? m.tenantEnabled);
          return Boolean(eff || m.planEnabled || m.fromAddon);
        });
        if (hasNotif) {
          this.refreshNotificacionesLicensePanel(id);
        } else {
          this.notifLicenseTerms.set(null);
          this.enabledNotifMessageTypeCount.set(0);
        }
      },
      error: () => {
        if (this.isStaleTenantResponse(id)) return;
        this.modulesLoading.set(false);
      },
    });
  }

  private refreshNotificacionesLicensePanel(tenantId: number): void {
    this.notifLicenseTermsLoading.set(true);
    forkJoin({
      terms: this.tenantService.getNotificacionesLicenseTerms(tenantId),
      types: this.tenantService.listNotificationMessageTypes(tenantId),
    }).subscribe({
      next: ({ terms, types }) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.notifLicenseTerms.set(terms);
        this.enabledNotifMessageTypeCount.set(types.filter((t) => t.enabled).length);
        this.patchNotifLicenseFormFromDto(terms);
        this.notifLicenseTermsLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.notifLicenseTermsLoading.set(false);
      },
    });
  }

  private patchNotifLicenseFormFromDto(d: NotificacionesLicenseTermsDto): void {
    const isoToLocalInput = (iso: string | null | undefined): string => {
      if (!iso) return '';
      const s = String(iso);
      if (s.length >= 16 && s.includes('T')) return s.slice(0, 16);
      return '';
    };
    this.notifLicenseForm.patchValue(
      {
        licenseKind: d.licenseKind,
        maxDevices: d.maxDevices === -1 ? 1 : d.maxDevices,
        devicesUnlimited: d.maxDevices === -1,
        maxMessageTypes: d.maxMessageTypes === -1 ? 1 : d.maxMessageTypes,
        messageTypesUnlimited: d.maxMessageTypes === -1,
        priceAmount: d.priceAmount,
        currencyCode: (d.currencyCode || 'ARS').trim().toUpperCase(),
        priceOverrideReason: d.priceOverrideReason ?? '',
        validFrom: isoToLocalInput(d.validFrom),
        validUntil: isoToLocalInput(d.validUntil),
        notes: d.notes ?? '',
      },
      { emitEvent: false },
    );
  }

  /** True si los tipos de mensaje habilitados superan el límite de la licencia guardada. */
  notifLicenseProvisioningBlocked(): boolean {
    const terms = this.notifLicenseTerms();
    const n = this.enabledNotifMessageTypeCount();
    if (!terms || terms.maxMessageTypes === -1) return false;
    return n > terms.maxMessageTypes;
  }

  saveNotifLicenseTerms(): void {
    if (this.readonlyMode()) return;
    const id = this.tenantId();
    if (id === null) return;
    this.notifLicenseForm.markAllAsTouched();
    if (this.notifLicenseForm.invalid) return;
    const v = this.notifLicenseForm.getRawValue();
    const body: PutNotificacionesLicenseTermsDto = {
      licenseKind: v.licenseKind,
      maxDevices: v.devicesUnlimited ? -1 : Number(v.maxDevices),
      maxMessageTypes: v.messageTypesUnlimited ? -1 : Number(v.maxMessageTypes),
      priceAmount: Number(v.priceAmount),
      currencyCode: String(v.currencyCode || 'ARS')
        .trim()
        .toUpperCase(),
      priceOverrideReason: v.priceOverrideReason?.trim() || null,
      validFrom: v.validFrom ? new Date(v.validFrom).toISOString() : null,
      validUntil: v.validUntil ? new Date(v.validUntil).toISOString() : null,
      notes: v.notes?.trim() || null,
    };
    this.notifLicenseSaving.set(true);
    this.error.set(null);
    this.tenantService.putNotificacionesLicenseTerms(id, body).subscribe({
      next: (terms) => {
        this.notifLicenseSaving.set(false);
        this.notifLicenseTerms.set(terms);
        this.patchNotifLicenseFormFromDto(terms);
        void this.msgBox.show({
          title: this.translate.instant('common.success'),
          html: `<p>${escapeHtml(this.translate.instant('tenants.notifLicenseSaveSuccess'))}</p>`,
          confirm: false,
        });
      },
      error: (err: unknown) => {
        this.notifLicenseSaving.set(false);
        const msg =
          err && typeof err === 'object' && err !== null && 'error' in err
            ? String((err as { error?: { error?: string } }).error?.error ?? 'Error')
            : 'Error';
        this.error.set(msg);
        void this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: `<p>${escapeHtml(msg)}</p>`,
          confirm: false,
        });
      },
    });
  }

  private loadUsage(tenantId: number): void {
    this.usageLoading.set(true);
    this.tenantService.getTenantUsage(tenantId).subscribe({
      next: (u) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantUsage.set(u);
        this.usageLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.usageLoading.set(false);
      },
    });
  }

  getUsageLimit(limitCode: string): number | null {
    const u = this.tenantUsage();
    if (!u?.limits?.length) return null;
    const limit = u.limits.find((l) => l.limitCode === limitCode);
    return limit != null ? limit.limitValue : null;
  }

  /** Etiqueta legible para códigos de límite del plan (service_plan_limit.metric_code). */
  usageMetricLabel(code: string): string {
    const key = `tenants.usageMetric.${code}`;
    const t = this.translate.instant(key);
    return t !== key ? t : code;
  }

  contractUsageSummaryText(): string {
    const u = this.tenantUsage();
    if (!u) return '';
    return this.translate.instant('tenants.contractUsageSummary', {
      users: u.usersUsed,
      modules: u.modulesEnabled,
    });
  }

  activeTenantUsersCount(): number {
    return this.tenantUsers().filter((u) => u.isActive).length;
  }

  /** Puede activarse otro usuario (o crear uno activo) sin superar maxUsers. */
  canEnableInactiveUser(): boolean {
    const max = this.getUsageLimit('maxUsers');
    if (max == null) return true;
    return this.activeTenantUsersCount() < max;
  }

  /** Hay más usuarios activos que el cupo (p. ej. tras bajar de plan). */
  planUsersExceeded(): boolean {
    const max = this.getUsageLimit('maxUsers');
    if (max == null) return false;
    return this.activeTenantUsersCount() > max;
  }

  usersQuotaSummary(): string {
    const max = this.getUsageLimit('maxUsers');
    if (max == null) return '';
    return this.translate.instant('tenants.usersQuotaLine', {
      active: this.activeTenantUsersCount(),
      max,
    });
  }

  userActiveToggleDisabled(u: TenantUser): boolean {
    if (this.readonlyMode()) return true;
    if (this.userTogglingId() === u.userId) return true;
    if (u.isActive) return false;
    return !this.canEnableInactiveUser();
  }

  private loadTenantRoles(tenantId: number): void {
    this.tenantService.getTenantRoles(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantRoles.set(list);
        if (list.length > 0 && this.newUserRoleId() == null) {
          this.newUserRoleId.set(String(list[0].roleId));
        }
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantRoles.set([]);
      },
    });
  }

  createTenantUser(): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    const email = this.newUserEmail().trim();
    const roleId = this.newUserRoleId();
    const password = this.newUserPassword().trim();
    if (!email || !roleId) {
      this.error.set(this.translate.instant('tenants.tenantUserCreateRequired'));
      return;
    }
    if (!password) {
      this.error.set(this.translate.instant('tenants.tenantUserPasswordRequired'));
      return;
    }
    if (!this.canEnableInactiveUser()) {
      this.error.set(this.translate.instant('tenants.planLimitUsersReached'));
      return;
    }
    this.creatingTenantUser.set(true);
    this.error.set(null);
    this.tenantService
      .createTenantUser(id, {
        email,
        roleId,
        password,
        firstName: this.newUserFirstName().trim() || undefined,
        credentialDelivery: 'manual',
      })
      .subscribe({
        next: () => {
          this.creatingTenantUser.set(false);
          this.newUserEmail.set('');
          this.newUserFirstName.set('');
          this.newUserPassword.set('');
          this.loadUsers(id);
          this.loadUsage(id);
        },
        error: (err) => {
          this.creatingTenantUser.set(false);
          const code = err?.error?.error;
          if (code === 'plan_limit_reached' || err?.status === 403) {
            this.error.set(this.translate.instant('tenants.planLimitUsersReached'));
          } else {
            this.error.set(
              typeof err?.error?.error === 'string' ? err.error.error : err?.message ?? 'Error',
            );
          }
        },
      });
  }

  openTenantUserPasswordDialog(u: TenantUser): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    const ref = this.dialog.open(PlatformTenantUserPasswordDialogComponent, {
      width: '440px',
      maxHeight: '90vh',
      panelClass: 'platform-tenant-user-password-dialog',
      data: { tenantId: id, user: u },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.loadUsers(id);
    });
  }

  openTenantUserEditDialog(u: TenantUser): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    const roles = this.tenantRoles();
    if (!roles.length) return;
    const ref = this.dialog.open(PlatformTenantUserEditDialogComponent, {
      width: '440px',
      maxHeight: '90vh',
      panelClass: 'platform-tenant-user-edit-dialog',
      autoFocus: 'first-tabbable',
      data: { tenantId: id, user: u, roles },
    });
    ref.afterClosed().subscribe((saved) => {
      if (saved) this.loadUsers(id);
    });
  }

  async confirmDeleteTenantUser(u: TenantUser): Promise<void> {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    const label = u.email?.trim() || u.username;
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>${escapeHtml(this.translate.instant('tenants.tenantUserDeleteConfirm', { user: label }))}</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.userTogglingId.set(u.userId);
    this.error.set(null);
    this.tenantService.deleteTenantUser(id, u.userId).subscribe({
      next: () => {
        this.userTogglingId.set(null);
        this.loadUsers(id);
        this.loadUsage(id);
      },
      error: (err) => {
        this.userTogglingId.set(null);
        this.error.set(
          typeof err?.error?.error === 'string' ? err.error.error : err?.message ?? 'Error',
        );
      },
    });
  }

  onTenantUserActiveToggle(u: TenantUser, checked: boolean): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    if (!checked && u.isActive) {
      // ok
    } else if (checked && !u.isActive && !this.canEnableInactiveUser()) {
      return;
    }
    this.userTogglingId.set(u.userId);
    this.error.set(null);
    this.tenantService.patchTenantUser(id, u.userId, { isActive: checked }).subscribe({
      next: () => {
        this.userTogglingId.set(null);
        this.loadUsers(id);
        this.loadUsage(id);
      },
      error: (err) => {
        this.userTogglingId.set(null);
        const code = err?.error?.error;
        if (code === 'plan_limit_reached' || err?.status === 403) {
          this.error.set(this.translate.instant('tenants.planLimitUsersReached'));
        } else {
          this.error.set(
            typeof err?.error?.error === 'string' ? err.error.error : err?.message ?? 'Error',
          );
        }
      },
    });
  }

  private loadUsers(tenantId: number): void {
    this.usersLoading.set(true);
    this.tenantService.getTenantUsers(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantUsers.set(list);
        this.usersLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.usersLoading.set(false);
      },
    });
  }

  private loadAudit(tenantId: number): void {
    this.auditLoading.set(true);
    this.tenantService.getTenantAudit(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantAudit.set(list);
        this.auditLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.auditLoading.set(false);
      },
    });
  }

  private loadActivity(tenantId: number): void {
    this.activityLoading.set(true);
    this.tenantService.getTenantActivity(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.activity.set((list ?? []).slice(0, 20));
        this.activityLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.activityLoading.set(false);
      },
    });
  }

  private loadDesktopTelemetry(tenantId: number): void {
    this.desktopTelemetryLoading.set(true);
    this.tenantService.getTenantDesktopTelemetry(tenantId, 25).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.desktopTelemetry.set(list ?? []);
        this.desktopTelemetryLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.desktopTelemetryLoading.set(false);
      },
    });
  }

  formatDesktopEventLabel(eventCode: string, message: string): string {
    const key = DESKTOP_TELEMETRY_EVENT_KEYS[eventCode];
    if (key) {
      const translated = this.translate.instant(key);
      if (translated !== key) return translated;
    }
    return message?.trim() || eventCode;
  }

  getDesktopTelemetryIcon(eventCode: string, level: string): string {
    if (eventCode.includes('failed') || level === 'error') return 'error_outline';
    if (eventCode.includes('campaign')) return 'campaign';
    if (eventCode.includes('send')) return 'send';
    if (eventCode.includes('auth') || eventCode.includes('login')) return 'login';
    if (eventCode.includes('import')) return 'upload_file';
    if (eventCode.includes('license')) return 'verified_user';
    return 'desktop_windows';
  }

  /** Human-readable action label via i18n; fallback to raw action if no mapping. */
  formatActionLabel(action: string): string {
    if (!action) return '';
    const key = ACTIVITY_ACTION_KEYS[action];
    if (key) {
      const translated = this.translate.instant(key);
      return translated !== key ? translated : action;
    }
    return action;
  }

  /** Icon name for activity action (user.* → person, module.* → extension, etc.). */
  getActivityIcon(action: string): string {
    if (!action) return 'info';
    if (action.startsWith('user.')) return 'person';
    if (action.startsWith('module.')) return 'extension';
    if (action.startsWith('api_key.') || action.startsWith('apikey.')) return 'key';
    if (action.startsWith('webhook.')) return 'link';
    if (action.startsWith('plan.')) return 'payments';
    return 'info';
  }

  /** Relative time label (e.g. "2 minutes ago", "Yesterday") using Intl.RelativeTimeFormat when available. */
  formatRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const diffMs = d.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHour = Math.round(diffMin / 60);
    const diffDay = Math.round(diffHour / 24);

    const locale = this.translate.currentLang || this.translate.defaultLang || 'en';
    try {
      if (typeof Intl !== 'undefined' && Intl.RelativeTimeFormat) {
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        if (Math.abs(diffSec) < 60) return rtf.format(diffSec, 'second');
        if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
        if (Math.abs(diffHour) < 24) return rtf.format(diffHour, 'hour');
        if (Math.abs(diffDay) < 7) return rtf.format(diffDay, 'day');
        if (Math.abs(diffDay) < 30) return rtf.format(Math.round(diffDay / 7), 'week');
        if (Math.abs(diffDay) < 365) return rtf.format(Math.round(diffDay / 30), 'month');
        return rtf.format(Math.round(diffDay / 365), 'year');
      }
    } catch {
      // Intl.RelativeTimeFormat not available or failed
    }
    return d.toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
  }

  private loadApiKeys(tenantId: number): void {
    this.apiKeysLoading.set(true);
    this.tenantService.getTenantApiKeys(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.apiKeys.set(list);
        this.apiKeysLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.apiKeysLoading.set(false);
      },
    });
  }

  private loadTenantTheme(tenantId: number): void {
    this.themeLoading.set(true);
    this.tenantService.getTenantTheme(tenantId).subscribe({
      next: (theme) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantTheme.set(theme);
        this.patchTenantBrandingFormFromTheme(theme);
        this.recomputeRecommendations();
        this.themeLoading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.themeLoading.set(false);
      },
    });
  }

  /** Igual que `SettingsPage.patchFormsFromDto` pero desde `TenantThemeConfig`. */
  private patchTenantBrandingFormFromTheme(th: TenantThemeConfig): void {
    const eff = (key: string): string =>
      th.effectiveTheme?.find((e) => e.colorKey === key)?.colorValue ?? '';
    const tm = String(th.themeMode ?? 'light').toLowerCase();
    const themeModeDefault: 'light' | 'dark' | 'auto' | 'system' =
      tm === 'light' || tm === 'dark' || tm === 'auto' || tm === 'system' ? tm : 'light';
    this.tenantBrandingForm.patchValue({
      primaryColor: th.base.primary,
      accentColor: eff('accent') || eff('buttonSecondary') || eff('tertiary') || th.base.secondary || '#4dd2f0',
      buttonCancelColor: eff('textButton') || '#5f6b7a',
      fontFamily: th.typography.fontFamily ?? '',
      headingFontFamily: th.typography.headingFontFamily ?? '',
      baseFontSize: th.typography.baseFontSize ?? 16,
      loginBackgroundUrl: th.assets.loginBackgroundUrl ?? '',
      logoFileId: th.assets.logoFileId ?? null,
      logoDarkFileId: th.assets.logoDarkFileId ?? null,
      logoCompactFileId: th.assets.logoCompactFileId ?? null,
      logoCompactDarkFileId: th.assets.logoCompactDarkFileId ?? null,
      faviconFileId: th.assets.faviconFileId ?? null,
      loginBackgroundLightFileId: th.assets.loginBackgroundLightFileId ?? null,
      loginBackgroundDarkFileId: th.assets.loginBackgroundDarkFileId ?? null,
      appBackgroundPatternFileId: th.assets.appBackgroundPatternFileId ?? null,
      themeModeDefault,
      logoSlotSidebar: this.normalizeLogoSlot(th.assets.logoSlotSidebar),
      logoSlotLogin: this.normalizeLogoSlot(th.assets.logoSlotLogin),
      logoSlotFavicon: this.normalizeLogoSlot(th.assets.logoSlotFavicon),
      logoSlotSidebarCollapsed: this.normalizeLogoSlot(th.assets.logoSlotSidebarCollapsed),
      companyDisplayName: th.assets.companyDisplayName ?? '',
    });
    this.syncFontPresetFromForm();
    this.advisorColor1.set(th.base.primary || '#0FA2CC');
  }

  tenantBrandingPublicUrl(tenantCode: string, fileId: string): string {
    const path = `v1/public/tenant-branding-asset/${encodeURIComponent(tenantCode.trim().toLowerCase())}/${encodeURIComponent(fileId)}`;
    return this.api.buildUrl(path);
  }

  /**
   * Rutas `/api/...` del JSON de branding deben apuntar al host de la API (mismo que `apiUrl`).
   * Si solo se usa ruta relativa, el navegador pide a :4201 y, sin proxy, el `<img>` falla y se ve el fallback Amautas.
   */
  private absoluteApiMediaUrl(relativeOrAbsolute: string | null | undefined): string | null {
    const u = relativeOrAbsolute?.trim();
    if (!u) return null;
    if (/^https?:\/\//i.test(u)) return u;
    const path = u.replace(/^\/api\/?/, '').replace(/^\/+/, '');
    return this.api.buildUrl(path);
  }

  previewUrlForTenantFileId(fileId: string | null | undefined): string | null {
    const code = (this.tenantTheme()?.tenantCode ?? this.tenant()?.tenantCode)?.trim();
    if (!fileId?.trim() || !code) return null;
    const u = this.tenantBrandingPublicUrl(code, fileId.trim());
    return `${u}?t=${this.assetCacheBuster()}`;
  }

  tenantPreviewUrlForField(field: TenantBrandingFileIdField): string | null {
    const slot = TENANT_BRANDING_RESOLVED_SLOT[field];
    const resolved = this.tenantTheme()?.brandingResolved?.assets?.[slot];
    const fid = (this.tenantBrandingForm.get(field)?.value as string | null | undefined)?.trim() || null;
    const resolvedFid = resolved?.fileId?.trim() || null;

    // Cambio local pendiente de persistir (subida reciente).
    if (fid && fid !== resolvedFid) {
      const pending = this.previewUrlForTenantFileId(fid);
      if (pending) return pending;
    }

    // URL canónica del API (tenant vs plataforma según herencia).
    if (resolved?.url) {
      const abs = this.absoluteApiMediaUrl(resolved.url);
      if (abs) return `${abs.split('?')[0]}?t=${this.assetCacheBuster()}`;
    }

    return this.previewUrlForTenantFileId(fid);
  }

  tenantInheritedForField(field: TenantBrandingFileIdField): boolean {
    if (this.tenantBrandingForm.get(field)?.value) return false;
    const slot = TENANT_BRANDING_RESOLVED_SLOT[field];
    return !!this.tenantTheme()?.brandingResolved?.assets?.[slot]?.inheritedFromPlatform;
  }

  tenantAssetUpload(
    type:
      | 'logo'
      | 'logo_dark'
      | 'logo_compact'
      | 'logo_compact_dark'
      | 'favicon'
      | 'login_background_light'
      | 'login_background_dark'
      | 'app_background_pattern',
  ): (file: File) => import('rxjs').Observable<{ id: string }> {
    return (file: File) => {
      const id = this.tenantId();
      if (id === null) throw new Error('tenant');
      return this.tenantService.uploadTenantThemeAsset(id, file, type).pipe(
        map((res) => {
          this.assetCacheBuster.update((n) => n + 1);
          return { id: res.fileId };
        }),
      );
    };
  }

  onTenantAssetFileId(field: TenantBrandingFileIdField, ev: { id: string }): void {
    this.tenantBrandingForm.patchValue({ [field]: ev.id } as Record<string, string>);
    this.cdr.markForCheck();
    this.flushTenantBrandingAssets();
  }

  clearTenantAsset(field: TenantBrandingFileIdField): void {
    this.tenantBrandingForm.patchValue({ [field]: null } as Record<string, null>);
    this.assetCacheBuster.update((n) => n + 1);
    this.cdr.markForCheck();
    this.flushTenantBrandingAssets();
  }

  private flushTenantBrandingAssets(): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    this.themeSaving.set(true);
    this.error.set(null);
    this.tenantService.updateTenantTheme(id, this.buildTenantThemeUpdatePayload()).subscribe({
      next: (res) => {
        if (this.isStaleTenantResponse(id)) {
          this.themeSaving.set(false);
          return;
        }
        this.themeSaving.set(false);
        this.tenantTheme.set(res);
        this.patchTenantBrandingFormFromTheme(res);
        this.recomputeRecommendations();
        this.assetCacheBuster.update((n) => n + 1);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (this.isStaleTenantResponse(id)) {
          this.themeSaving.set(false);
          return;
        }
        this.themeSaving.set(false);
        this.error.set(err?.message ?? err?.error?.error ?? 'Error al guardar archivos de marca');
      },
    });
  }

  private mapThemeModeDefaultToBase(m: string): 'light' | 'dark' | 'auto' {
    const s = String(m || '').toLowerCase();
    if (s === 'dark') return 'dark';
    if (s === 'light') return 'light';
    return 'auto';
  }

  private buildTenantThemeUpdatePayload(): UpdateTenantThemePayload {
    const t = this.tenantTheme();
    if (!t) {
      throw new Error('tenant_theme');
    }
    const v = this.tenantBrandingForm.getRawValue();
    const tokens = this.tenantThemeSvc.resolvedTokensFromBranding(
      {
        primaryColor: v.primaryColor,
        accentColor: v.accentColor,
        buttonCancelColor: v.buttonCancelColor,
      },
      null,
    );
    const legacy = legacyColumnsFromTokens(tokens);
    const baseFont = Number(v.baseFontSize);
    return {
      strategy: 'custom',
      themeModeDefault: v.themeModeDefault,
      accentColor: v.accentColor?.trim() || undefined,
      base: {
        primary: v.primaryColor,
        secondary: v.primaryColor,
        themeMode: this.mapThemeModeDefaultToBase(v.themeModeDefault),
        fontFamily: v.fontFamily?.trim() || undefined,
        headingFontFamily: v.headingFontFamily?.trim() || undefined,
        baseFontSize: Number.isFinite(baseFont) ? baseFont : t.typography.baseFontSize,
      },
      assets: {
        logoFileId: v.logoFileId,
        logoDarkFileId: v.logoDarkFileId,
        logoCompactFileId: v.logoCompactFileId,
        logoCompactDarkFileId: v.logoCompactDarkFileId,
        faviconFileId: v.faviconFileId,
        loginBackgroundLightFileId: v.loginBackgroundLightFileId,
        loginBackgroundDarkFileId: v.loginBackgroundDarkFileId,
        appBackgroundPatternFileId: v.appBackgroundPatternFileId,
        loginBackgroundUrl: v.loginBackgroundUrl?.trim() ? v.loginBackgroundUrl.trim() : null,
        logoSlotSidebar: this.normalizeLogoSlot(v.logoSlotSidebar),
        logoSlotLogin: this.normalizeLogoSlot(v.logoSlotLogin),
        logoSlotFavicon: this.normalizeLogoSlot(v.logoSlotFavicon),
        logoSlotSidebarCollapsed: this.normalizeLogoSlot(v.logoSlotSidebarCollapsed),
        companyDisplayName: v.companyDisplayName?.trim() ? v.companyDisplayName.trim() : null,
      },
      overrides: {
        sidebarBg: legacy.sidebarBgColor,
        headerBg: legacy.headerBgColor,
        background: legacy.pageBackgroundColor,
        buttonPrimary: legacy.buttonPrimaryColor,
        buttonSecondary: legacy.buttonSecondaryColor,
        onSurface: legacy.textColor,
        textButton: v.buttonCancelColor,
      },
    };
  }

  loginPreviewBackground(): string {
    const field =
      this.brandPreviewMode() === 'dark' ? 'loginBackgroundDarkFileId' : 'loginBackgroundLightFileId';
    const u = this.tenantPreviewUrlForField(field);
    if (u) return `url("${u.replace(/"/g, '\\"')}")`;
    return 'linear-gradient(155deg, var(--color-primary-600, #0c8cb0), var(--color-primary-900, #063544))';
  }

  loginPatternOverlay(): string | null {
    const u = this.tenantPreviewUrlForField('appBackgroundPatternFileId');
    return u ? `url("${u.replace(/"/g, '\\"')}")` : null;
  }

  private absoluteStaticAsset(path: string): string {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  loginMockLogoBg(): string {
    const field = this.brandPreviewMode() === 'dark' ? 'logoDarkFileId' : 'logoFileId';
    const u = this.tenantPreviewUrlForField(field);
    if (u) return `url("${u.replace(/"/g, '\\"')}")`;
    return 'none';
  }

  private normalizeLogoSlot(v: string | null | undefined): TenantLogoVariant {
    const s = String(v ?? '').trim();
    if (s === 'alternate' || s === 'primary_reduced' || s === 'alternate_reduced' || s === 'primary') {
      return s;
    }
    return 'primary';
  }

  togglePaletteTools(): void {
    this.showPaletteTools.update((v) => !v);
  }

  onFontPresetChange(value: string): void {
    if (value === 'custom') {
      this.selectedFontPresetId.set('custom');
      return;
    }
    const preset = FONT_PRESETS.find((p) => p.id === value);
    if (!preset) return;
    this.tenantBrandingForm.patchValue({ fontFamily: preset.fontFamily }, { emitEvent: false });
    this.selectedFontPresetId.set(value);
  }

  private normalizeFontStack(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s+/g, '');
  }

  private syncFontPresetFromForm(): void {
    const raw = this.tenantBrandingForm.get('fontFamily')?.value ?? '';
    if (!raw.trim()) {
      this.selectedFontPresetId.set('custom');
      return;
    }
    const n = this.normalizeFontStack(raw);
    const match = FONT_PRESETS.find((p) => this.normalizeFontStack(p.fontFamily) === n);
    this.selectedFontPresetId.set(match?.id ?? 'custom');
  }

  /** Igual que `SettingsPage.applyPalette`: aplica preset y marca selección. */
  applyPalette(palette: ThemePalette): void {
    this.applyTenantPalette(palette);
  }

  applyTenantPalette(palette: ThemePalette): void {
    this.selectedTenantPaletteId.set(palette.id);
    this.tenantBrandingForm.patchValue({
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
    });
  }

  setAdvisorColor(slot: 1 | 2 | 3, value: string): void {
    const v = String(value ?? '').trim();
    if (slot === 1) this.advisorColor1.set(v);
    if (slot === 2) this.advisorColor2.set(v);
    if (slot === 3) this.advisorColor3.set(v);
    this.recomputeRecommendations();
  }

  applyRecommendedPalette(palette: ThemePalette): void {
    this.applyTenantPalette(palette);
  }

  private recomputeRecommendations(): void {
    const c1 = this.normalizeHex(this.advisorColor1());
    const c2 = this.normalizeHex(this.advisorColor2());
    const c3 = this.normalizeHex(this.advisorColor3());
    if (!c1) {
      this.paletteRecommendations.set(this.themePalettes.slice(0, 4));
      return;
    }
    const generated = buildAdvisorGeneratedPalette(c1, c2, c3);
    const ranked = this.themePalettes
      .map((p) => ({ p, score: this.scorePalette(p, c1, c2, c3) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((x) => x.p);
    this.paletteRecommendations.set([generated, ...ranked]);
  }

  private scorePalette(palette: ThemePalette, c1: string, c2: string | null, c3: string | null): number {
    let score = this.distance(palette.primaryColor, c1) * 2.4;
    const accent = palette.accentColor;
    if (c2) score += this.distance(accent, c2) * 1.7;
    if (c3) score += this.distance(accent, c3) * 1.2;
    return score;
  }

  private normalizeHex(value: string): string | null {
    const v = String(value ?? '').trim();
    if (!v) return null;
    return /^#([0-9a-fA-F]{6})$/.test(v) ? v.toUpperCase() : null;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const n = hex.replace('#', '');
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  private distance(a: string, b: string): number {
    const ca = this.hexToRgb(a);
    const cb = this.hexToRgb(b);
    const dr = ca.r - cb.r;
    const dg = ca.g - cb.g;
    const db = ca.b - cb.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  saveTenantTheme(): void {
    if (this.tenantBrandingForm.invalid) return;
    const id = this.tenantId();
    const t = this.tenantTheme();
    if (id === null || !t) return;
    this.themeSaving.set(true);
    this.error.set(null);
    this.tenantService.updateTenantTheme(id, this.buildTenantThemeUpdatePayload()).subscribe({
      next: (res) => {
        if (this.isStaleTenantResponse(id)) {
          this.themeSaving.set(false);
          return;
        }
        this.themeSaving.set(false);
        this.tenantTheme.set(res);
        this.patchTenantBrandingFormFromTheme(res);
        this.recomputeRecommendations();
        this.assetCacheBuster.update((n) => n + 1);
        this.cdr.markForCheck();
      },
      error: (err) => {
        if (this.isStaleTenantResponse(id)) {
          this.themeSaving.set(false);
          return;
        }
        this.themeSaving.set(false);
        this.error.set(err?.message ?? err?.error?.error ?? 'Error al guardar theme');
      },
    });
  }

  createApiKey(): void {
    const tenantId = this.tenantId();
    const name = this.newApiKeyName().trim();
    if (tenantId === null || !name) return;
    this.creatingApiKey.set(true);
    this.error.set(null);
    this.tenantService.createTenantApiKey(tenantId, name).subscribe({
      next: () => {
        this.newApiKeyName.set('');
        this.loadApiKeys(tenantId);
        this.creatingApiKey.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? err?.error?.error ?? 'Error al crear API key');
        this.creatingApiKey.set(false);
      },
    });
  }

  async deactivateApiKey(key: TenantApiKey): Promise<void> {
    if (!key.isActive) return;
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Desactivar la API key "${escapeHtml(key.name)}"? No se puede volver a activar.</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    const tenantId = this.tenantId();
    this.tenantService.deactivateApiKey(key.id).subscribe({
      next: () => tenantId !== null && this.loadApiKeys(tenantId),
      error: (err) => this.error.set(err?.message ?? err?.error?.error ?? 'Error al desactivar API key'),
    });
  }

  private loadWebhooks(tenantId: number): void {
    this.webhooksLoading.set(true);
    this.tenantService.getTenantWebhooks(tenantId).subscribe({
      next: (list) => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.tenantWebhooks.set(list);
        this.webhooksLoading.set(false);
      },
      error: () => {
        if (this.isStaleTenantResponse(tenantId)) return;
        this.webhooksLoading.set(false);
      },
    });
  }

  createWebhook(): void {
    const tenantId = this.tenantId();
    const url = this.newWebhookUrl().trim();
    if (tenantId === null || !url) return;
    this.creatingWebhook.set(true);
    this.error.set(null);
    this.tenantService.createTenantWebhook(tenantId, url).subscribe({
      next: () => {
        this.newWebhookUrl.set('');
        this.loadWebhooks(tenantId);
        this.creatingWebhook.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? err?.error?.error ?? 'Error al crear webhook');
        this.creatingWebhook.set(false);
      },
    });
  }

  async deactivateWebhook(webhook: TenantWebhook): Promise<void> {
    if (!webhook.isActive) return;
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Desactivar el webhook ${escapeHtml(webhook.url)}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    const tenantId = this.tenantId();
    this.tenantService.deactivateWebhook(webhook.id).subscribe({
      next: () => tenantId !== null && this.loadWebhooks(tenantId),
      error: (err) => this.error.set(err?.message ?? err?.error?.error ?? 'Error al desactivar webhook'),
    });
  }

  onModuleToggle(mod: TenantModule, enabled: boolean): void {
    if (this.readonlyMode()) return;
    const tenantId = this.tenantId();
    if (tenantId === null) return;
    if (!mod.editable) return;
    const canToggle = mod.platformEnabled && mod.planEnabled;
    if (enabled && !canToggle) return;
    this.moduleTogglingId.set(mod.moduleId);
    this.error.set(null);
    this.tenantService.patchTenantModule(tenantId, mod.moduleId, enabled).subscribe({
      next: () => {
        this.loadModules(tenantId);
        this.moduleTogglingId.set(null);
      },
      error: (err) => {
        this.moduleTogglingId.set(null);
        const code = err?.error?.error;
        const msg =
          code === 'module_not_allowed_by_plan'
            ? 'El plan del tenant no incluye este módulo'
            : code === 'module_manual_edit_disabled'
              ? 'La edición manual de módulos está deshabilitada. Usá el plan o add-ons.'
              : (err?.message ?? 'Error al actualizar módulo');
        this.error.set(msg);
      },
    });
  }

  canToggleModule(mod: TenantModule): boolean {
    return mod.editable === true && mod.platformEnabled === true && mod.planEnabled === true;
  }

  /** Add-on: módulo en el catálogo del producto pero no incluido en el plan. */
  canAddonAction(mod: TenantModule): boolean {
    return mod.platformEnabled && !mod.planEnabled;
  }

  onAddonToggle(mod: TenantModule, active: boolean): void {
    if (this.readonlyMode()) return;
    const tenantId = this.tenantId();
    if (tenantId === null || !this.canAddonAction(mod)) return;
    this.addonTogglingId.set(mod.moduleId);
    this.error.set(null);
    this.tenantService.patchTenantModuleAddon(tenantId, mod.moduleId, active).subscribe({
      next: () => {
        this.loadModules(tenantId);
        this.addonTogglingId.set(null);
      },
      error: (err) => {
        this.addonTogglingId.set(null);
        const code = err?.error?.error;
        const msg =
          code === 'module_not_in_product_catalog'
            ? 'Este módulo no está en el catálogo del producto del tenant.'
            : (err?.message ?? 'Error al actualizar add-on');
        this.error.set(msg);
      },
    });
  }


  toggleFeature(feature: TenantFeatureWithLabel): void {
    const id = this.tenantId();
    if (id === null || this.readonlyMode()) return;
    const updated = this.tenantFeatures().map((f) =>
      f.featureCode === feature.featureCode ? { ...f, enabled: !f.enabled } : f
    );
    const payload: TenantFeature[] = updated.map(({ featureCode, enabled }) => ({ featureCode, enabled }));
    this.featuresSaving.set(true);
    this.tenantService.updateTenantFeatures(id, payload).subscribe({
      next: (list) => {
        const merged: TenantFeatureWithLabel[] = AVAILABLE_FEATURE_FLAGS.map((af) => ({
          featureCode: af.code,
          enabled: list.find((f) => f.featureCode === af.code)?.enabled ?? false,
          label: af.label,
        }));
        this.tenantFeatures.set(merged);
        this.featuresSaving.set(false);
      },
      error: (err) => {
        this.error.set(err?.message ?? 'Error al actualizar feature flags');
        this.featuresSaving.set(false);
      },
    });
  }

  onStandaloneFeatureToggle(row: TenantStandaloneFeature, enabled: boolean): void {
    if (this.readonlyMode()) return;
    const id = this.tenantId();
    if (id === null) return;
    this.standaloneFeatureToggling.set(row.featureCode);
    this.error.set(null);
    this.tenantService.updateTenantFeatures(id, [{ featureCode: row.featureCode, enabled }]).subscribe({
      next: () => {
        this.standaloneFeatureToggling.set(null);
        this.refreshFeatureLists(id);
      },
      error: (err) => {
        this.standaloneFeatureToggling.set(null);
        this.error.set(err?.message ?? 'Error al actualizar la funcionalidad');
      },
    });
  }

  /** Add-on de feature (catálogo product_addon): misma regla que módulos — planEnabled false. */
  canStandaloneAddonAction(sf: TenantStandaloneFeature): boolean {
    const platform = sf.platformEnabled ?? true;
    const inBasePlan = sf.planEnabled ?? true;
    return platform && !inBasePlan;
  }

  onStandaloneAddonToggle(sf: TenantStandaloneFeature, active: boolean): void {
    this.onStandaloneFeatureToggle(sf, active);
  }

  /** Fila de tabla de módulos: catálogo Notificaciones (no Cobranzas). */
  isNotificacionesModuleRow(m: TenantModule): boolean {
    return String(m.moduleCode || '').toLowerCase() === 'notificaciones';
  }

  private triggerProvisioningDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /** Paquete firmado para la app de escritorio (módulo `notificaciones`). */
  downloadProvisioningPackage(moduleCode: string = 'notificaciones', plain = false): void {
    const id = this.tenantId();
    if (id === null) return;
    this.provisioningLoading.set(true);
    this.tenantService.downloadProvisioningPackage(id, moduleCode, plain).subscribe({
      next: async (blob) => {
        this.provisioningLoading.set(false);
        if (plain) {
          try {
            const text = await blob.text();
            const parsed = JSON.parse(text) as { format?: string; payload?: unknown };
            if (parsed?.format === 'amautas-license-encrypted') {
              await this.msgBox.show({
                title: this.translate.instant('common.error'),
                html: `<p>${escapeHtml(
                  this.translate.instant('tenants.provisioningPlainStillEncrypted'),
                )}</p>`,
                confirm: false,
              });
              return;
            }
            if (parsed?.payload == null) {
              await this.msgBox.show({
                title: this.translate.instant('common.error'),
                html: `<p>${escapeHtml(this.translate.instant('tenants.provisioningPlainInvalid'))}</p>`,
                confirm: false,
              });
              return;
            }
            const plainBlob = new Blob([text], { type: 'application/octet-stream' });
            this.triggerProvisioningDownload(plainBlob, 'licencia-plain.amautas');
          } catch {
            await this.msgBox.show({
              title: this.translate.instant('common.error'),
              html: `<p>${escapeHtml(this.translate.instant('tenants.provisioningPlainInvalid'))}</p>`,
              confirm: false,
            });
            return;
          }
        } else {
          this.triggerProvisioningDownload(blob, 'licencia.amautas');
        }
        void this.msgBox.show({
          title: this.translate.instant('common.success'),
          html: `<p>${escapeHtml(
            this.translate.instant(
              plain ? 'tenants.provisioningDownloadPlainSuccess' : 'tenants.provisioningDownloadSuccess',
            ),
          )}</p>`,
          confirm: false,
        });
      },
      error: async (err: unknown) => {
        this.provisioningLoading.set(false);
        let raw = 'Error';
        const e = err as { error?: unknown; message?: string };
        if (e?.error instanceof Blob) {
          try {
            const text = await e.error.text();
            const j = JSON.parse(text) as { error?: string; message?: string; code?: string };
            raw = j.message ?? j.error ?? text;
            if (j.code) raw = `${j.code}: ${raw}`;
          } catch {
            raw = e.message ?? 'Error';
          }
        } else if (e?.error && typeof e.error === 'object' && e.error !== null && 'error' in e.error) {
          raw = String((e.error as { error?: string }).error ?? e.message);
        } else if (e?.error && typeof e.error === 'object' && e.error !== null && 'message' in e.error) {
          const o = e.error as { message?: string; code?: string };
          raw = String(o.message ?? e.message);
          if (o.code) raw = `${o.code}: ${raw}`;
        } else {
          raw = e?.message ?? 'Error';
        }
        await this.msgBox.show({
          title: this.translate.instant('common.error'),
          html: `<p>${escapeHtml(String(raw))}</p>`,
          confirm: false,
        });
      },
    });
  }

  async suspendTenant(): Promise<void> {
    const t = this.tenant();
    const id = this.tenantId();
    if (!t || id === null) return;
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Suspender el tenant ${escapeHtml(t.tenantName ?? '')}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.actionPending.set(true);
    this.error.set(null);
    this.tenantService.suspendTenant(t.tenantId).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.loadTenant(id);
      },
      error: (err) => {
        this.actionPending.set(false);
        this.error.set(err?.message ?? 'Error al suspender');
      },
    });
  }

  async activateTenant(): Promise<void> {
    const t = this.tenant();
    const id = this.tenantId();
    if (!t || id === null) return;
    const confirmed = await this.msgBox.show({
      title: this.translate.instant('common.confirm'),
      html: `<p>¿Activar el tenant ${escapeHtml(t.tenantName ?? '')}?</p>`,
      confirm: true,
    });
    if (!confirmed) return;
    this.actionPending.set(true);
    this.error.set(null);
    this.tenantService.activateTenant(t.tenantId).subscribe({
      next: () => {
        this.actionPending.set(false);
        this.loadTenant(id);
      },
      error: (err) => {
        this.actionPending.set(false);
        this.error.set(err?.message ?? 'Error al activar');
      },
    });
  }

  changePlan(): void {
    const t = this.tenant();
    const first = t?.serviceSubscriptions?.[0];
    if (first?.productId != null) {
      this.applyPlanChangeForProduct(first.productId);
      return;
    }
    const id = this.tenantId();
    const servicePlanId = this.selectedPlanId();
    if (id === null || servicePlanId === null) return;
    if (t && t.servicePlanId === servicePlanId) return;
    this.planUpdating.set(true);
    this.error.set(null);
    this.tenantService.changeTenantPlan(id, servicePlanId).subscribe({
      next: (updated) => {
        this.tenant.set(updated);
        this.syncPlanSelectionsFromTenant(updated);
        this.selectedPlanId.set(updated.servicePlanId ?? null);
        this.loadModules(updated.tenantId);
        this.planUpdating.set(false);
      },
      error: (err) => {
        this.planUpdating.set(false);
        this.error.set(err?.message ?? 'Error al cambiar plan');
      },
    });
  }
}

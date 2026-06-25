import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../../core/api/api.service';
import { Tenant } from '../models/tenant.interface';
import type { TenantDetail } from '../models/tenant-detail.interface';
import { CreateTenantDto } from '../models/create-tenant.dto';
import { UpdateTenantDto } from '../models/update-tenant.dto';
import type { TenantOnboardingDto } from '../models/tenant-onboarding.dto';
import { TenantFeature, TenantFeatureUpdate, TenantStandaloneFeature } from '../models/tenant-feature.interface';
import { TenantModule } from '../models/tenant-module.interface';
import { TenantUser } from '../models/tenant-user.interface';
import { TenantAudit } from '../models/tenant-audit.interface';
import type { TenantActivityItem } from '../models/tenant-activity.interface';
import type { TenantDesktopTelemetryItem } from '../models/tenant-desktop-telemetry.interface';
import { TenantUsage } from '../models/tenant-usage.interface';
import { TenantApiKey } from '../models/tenant-api-key.interface';
import { TenantWebhook } from '../models/tenant-webhook.interface';
import { ServicePlan } from '../models/service-plan.interface';
import type { TenantRoleOption } from '../models/tenant-role-option.interface';
import type {
  TenantThemeConfig,
  TenantThemeSaveResponse,
  UpdateTenantThemePayload,
} from '../models/tenant-theme.interface';

/** Path relative to apiUrl (e.g. apiUrl = .../api → .../api/v1/platform/tenants) */
const BASE_PATH = 'v1/platform/tenants';
const ONBOARDING_PATH = 'v1/platform/onboarding';
const SERVICE_PLANS_PATH = 'v1/platform/service-plans';
const API_KEYS_PATH = 'v1/platform/api-keys';
const WEBHOOKS_PATH = 'v1/platform/webhooks';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly api = inject(ApiService);
  private readonly http = inject(HttpClient);

  getTenants(): Observable<Tenant[]> {
    return this.api.get<Tenant[]>(BASE_PATH);
  }

  getTenant(id: number): Observable<Tenant> {
    return this.api.get<Tenant>(`${BASE_PATH}/${id}`);
  }

  /** Check if tenant code is available. GET /api/v1/platform/tenants/check-code/:code → { available: boolean } */
  checkTenantCodeAvailable(code: string): Observable<{ available: boolean }> {
    const encoded = encodeURIComponent(code.trim().toLowerCase().replace(/\s+/g, '-'));
    return this.api.get<{ available: boolean }>(`${BASE_PATH}/check-code/${encoded}`);
  }

  /** Tenant detail with usersCount, modulesEnabledCount, planName, recentActivity */
  getTenantDetail(id: number): Observable<TenantDetail> {
    return this.api.get<TenantDetail>(`${BASE_PATH}/${id}`);
  }

  createTenant(data: CreateTenantDto): Observable<Tenant> {
    return this.api.post<Tenant>(BASE_PATH, data);
  }

  /** Full onboarding wizard: POST /api/v1/platform/onboarding (tenant, plan, modules, admin). */
  createTenantOnboarding(data: TenantOnboardingDto): Observable<{ tenant: { id: string; code: string; name: string; isActive: boolean; adminEmail?: string } }> {
    return this.api.post<{ tenant: { id: string; code: string; name: string; isActive: boolean; adminEmail?: string } }>(ONBOARDING_PATH, data);
  }

  updateTenant(id: number, data: UpdateTenantDto): Observable<Tenant> {
    return this.api.put<Tenant>(`${BASE_PATH}/${id}`, data);
  }

  activateTenant(id: number): Observable<Tenant> {
    return this.api.patch<Tenant>(`${BASE_PATH}/${id}/activate`, {});
  }

  suspendTenant(id: number): Observable<Tenant> {
    return this.api.patch<Tenant>(`${BASE_PATH}/${id}/suspend`, {});
  }

  getTenantFeatures(id: number): Observable<TenantFeature[]> {
    return this.api.get<TenantFeature[]>(`${BASE_PATH}/${id}/features`);
  }

  /** Features globales sin módulo asociado, con flag por tenant. */
  getTenantStandaloneFeatures(id: number): Observable<TenantStandaloneFeature[]> {
    return this.api.get<TenantStandaloneFeature[]>(`${BASE_PATH}/${id}/features/standalone`);
  }

  getTenantModules(id: number): Observable<TenantModule[]> {
    return this.api.get<TenantModule[]>(`${BASE_PATH}/${id}/modules`);
  }

  /**
   * Genera `licencia.amautas` (paquete firmado, escritorio). Respuesta binaria; usar con responseType blob en el caller.
   */
  downloadProvisioningPackage(tenantId: number, moduleCode: string, plain = false): Observable<Blob> {
    const path = `${BASE_PATH}/${tenantId}/modules/${encodeURIComponent(moduleCode)}/provisioning`;
    const url = plain ? `${this.api.buildUrl(path)}?plain=1` : this.api.buildUrl(path);
    const body = plain ? { plain: true } : {};
    return this.http.post(url, body, { responseType: 'blob' });
  }

  getTenantUsers(id: number): Observable<TenantUser[]> {
    return this.api.get<TenantUser[]>(`${BASE_PATH}/${id}/users`);
  }

  getTenantRoles(tenantId: number): Observable<TenantRoleOption[]> {
    return this.api.get<TenantRoleOption[]>(`${BASE_PATH}/${tenantId}/roles`);
  }

  createTenantUser(
    tenantId: number,
    body: {
      email: string;
      roleId: string;
      password?: string;
      firstName?: string;
      lastName?: string;
      username?: string;
      credentialDelivery?: string;
    },
  ): Observable<{ userId: number; username: string; email: string | null; roleCode: string | null; isActive: boolean }> {
    return this.api.post(`${BASE_PATH}/${tenantId}/users`, body);
  }

  patchTenantUser(
    tenantId: number,
    userId: number,
    body: {
      isActive?: boolean;
      password?: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      roleId?: string;
    },
  ): Observable<{ userId: number; username: string; email: string | null; roleCode: string | null; isActive: boolean }> {
    return this.api.patch(`${BASE_PATH}/${tenantId}/users/${userId}`, body);
  }

  deleteTenantUser(tenantId: number, userId: number): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>(`${BASE_PATH}/${tenantId}/users/${userId}`);
  }

  getTenantAudit(id: number): Observable<TenantAudit[]> {
    return this.api.get<TenantAudit[]>(`${BASE_PATH}/${id}/audit`);
  }

  /** Latest activity from tenant_audit_log (action, entityType, userEmail, etc.). */
  getTenantActivity(tenantId: number): Observable<TenantActivityItem[]> {
    return this.api.get<TenantActivityItem[]>(`${BASE_PATH}/${tenantId}/activity`);
  }

  /** Telemetría del módulo Notificaciones (app de escritorio → Core). */
  getTenantDesktopTelemetry(tenantId: number, limit = 30): Observable<TenantDesktopTelemetryItem[]> {
    return this.api.get<TenantDesktopTelemetryItem[]>(
      `${BASE_PATH}/${tenantId}/desktop-telemetry`,
      { limit, product: 'notificaciones-desktop' },
    );
  }

  getTenantUsage(id: number): Observable<TenantUsage> {
    return this.api.get<TenantUsage>(`${BASE_PATH}/${id}/usage`);
  }

  /** Update tenant module enabled state. Solo si la API tiene override manual habilitado. */
  patchTenantModule(tenantId: number, moduleId: number, enabled: boolean): Observable<{ ok: boolean }> {
    return this.api.patch<{ ok: boolean }>(`${BASE_PATH}/${tenantId}/modules/${moduleId}`, { enabled });
  }

  /** Add-on de módulo (fuera del plan base). Requiere que el módulo esté en el catálogo del producto. */
  patchTenantModuleAddon(tenantId: number, moduleId: number, active: boolean): Observable<{ ok: boolean }> {
    return this.api.patch<{ ok: boolean }>(`${BASE_PATH}/${tenantId}/module-addons/${moduleId}`, { active });
  }

  enableModule(tenantId: number, moduleId: number): Observable<{ ok: boolean }> {
    return this.patchTenantModule(tenantId, moduleId, true);
  }

  disableModule(tenantId: number, moduleId: number): Observable<{ ok: boolean }> {
    return this.patchTenantModule(tenantId, moduleId, false);
  }

  updateTenantFeatures(id: number, features: TenantFeatureUpdate[]): Observable<TenantFeature[]> {
    return this.api.put<TenantFeature[]>(`${BASE_PATH}/${id}/features`, features);
  }

  /** Plans for lookup: show servicePlanName instead of servicePlanId in UI */
  getServicePlans(params?: {
    country?: string;
    productId?: number;
    tenantId?: number;
    /** Incluye planes con is_active = false (además de los ya asignados al tenant si enviás tenantId). */
    includeInactive?: boolean;
  }): Observable<ServicePlan[]> {
    return this.api.get<ServicePlan[]>(SERVICE_PLANS_PATH, params);
  }

  changeTenantPlan(tenantId: number, servicePlanId: number, productId?: number | null): Observable<TenantDetail> {
    const body: { servicePlanId: number; productId?: number } = { servicePlanId };
    if (productId != null) body.productId = productId;
    return this.api.patch<TenantDetail>(`${BASE_PATH}/${tenantId}/change-plan`, body);
  }

  /** Cierra la suscripción abierta del producto (sin reemplazar por otro plan). */
  endProductSubscription(tenantId: number, productId: number): Observable<TenantDetail> {
    return this.api.patch<TenantDetail>(`${BASE_PATH}/${tenantId}/end-product-subscription`, { productId });
  }

  getTenantApiKeys(tenantId: number): Observable<TenantApiKey[]> {
    return this.api.get<TenantApiKey[]>(`${BASE_PATH}/${tenantId}/api-keys`);
  }

  createTenantApiKey(tenantId: number, name: string): Observable<TenantApiKey> {
    return this.api.post<TenantApiKey>(`${BASE_PATH}/${tenantId}/api-keys`, { name });
  }

  deactivateApiKey(id: number): Observable<TenantApiKey> {
    return this.api.patch<TenantApiKey>(`${API_KEYS_PATH}/${id}/deactivate`, {});
  }

  getTenantWebhooks(tenantId: number): Observable<TenantWebhook[]> {
    return this.api.get<TenantWebhook[]>(`${BASE_PATH}/${tenantId}/webhooks`);
  }

  createTenantWebhook(tenantId: number, url: string): Observable<TenantWebhook> {
    return this.api.post<TenantWebhook>(`${BASE_PATH}/${tenantId}/webhooks`, { url });
  }

  deactivateWebhook(id: number): Observable<TenantWebhook> {
    return this.api.patch<TenantWebhook>(`${WEBHOOKS_PATH}/${id}/deactivate`, {});
  }

  getTenantTheme(tenantId: number): Observable<TenantThemeConfig> {
    return this.api.get<TenantThemeConfig>(`${BASE_PATH}/${tenantId}/theme`);
  }

  updateTenantTheme(tenantId: number, payload: UpdateTenantThemePayload): Observable<TenantThemeSaveResponse> {
    return this.api.put<TenantThemeSaveResponse>(`${BASE_PATH}/${tenantId}/theme`, payload);
  }

  /**
   * Sube imagen de marca del tenant; devuelve la URL pública a guardar en logoUrl / faviconUrl / etc.
   * Tipos: logo, logo_dark, favicon, login_background.
   */
  uploadTenantThemeAsset(
    tenantId: number,
    file: File,
    type:
      | 'logo'
      | 'logo_dark'
      | 'logo_compact'
      | 'logo_compact_dark'
      | 'favicon'
      | 'login_background'
      | 'login_background_light'
      | 'login_background_dark'
      | 'app_background_pattern',
  ): Observable<{ publicUrl: string; fileId: string; tenantCode: string }> {
    const form = new FormData();
    form.append('file', file);
    form.append('type', type);
    const url = this.api.buildUrl(`${BASE_PATH}/${tenantId}/theme/upload`);
    return this.http
      .post<{ fileId: string; tenantCode: string }>(url, form)
      .pipe(
        map((res) => ({
          fileId: res.fileId,
          tenantCode: res.tenantCode,
          publicUrl: `/api/v1/public/tenant-branding-asset/${encodeURIComponent(res.tenantCode)}/${encodeURIComponent(String(res.fileId))}`,
        })),
      );
  }

  /** Consola tenant: aplanar grupos del menú lateral para usuarios no admin. */
  getTenantConsoleSidebar(tenantId: number): Observable<{ flattenGroupsForNonAdmin: boolean }> {
    return this.api.get<{ flattenGroupsForNonAdmin: boolean }>(`${BASE_PATH}/${tenantId}/console-sidebar`);
  }

  updateTenantConsoleSidebar(
    tenantId: number,
    body: { flattenGroupsForNonAdmin: boolean },
  ): Observable<{ flattenGroupsForNonAdmin: boolean }> {
    return this.api.put<{ flattenGroupsForNonAdmin: boolean }>(`${BASE_PATH}/${tenantId}/console-sidebar`, body);
  }

  /** Consola tenant: roles (solo plataforma). */
  listTenantConsoleRoles(tenantId: number): Observable<{ items: TenantConsoleRoleRow[] }> {
    return this.api.get<{ items: TenantConsoleRoleRow[] }>(`${BASE_PATH}/${tenantId}/console-admin/roles`);
  }

  listTenantConsoleAssignableFeatures(tenantId: number): Observable<{ items: TenantConsoleFeatureTreeNode[] }> {
    return this.api.get<{ items: TenantConsoleFeatureTreeNode[] }>(
      `${BASE_PATH}/${tenantId}/console-admin/features`,
    );
  }

  getTenantConsoleRoleFeatures(
    tenantId: number,
    roleId: string,
  ): Observable<{ items: TenantConsoleRoleFeatureItem[]; featureIds: string[] }> {
    return this.api.get<{ items: TenantConsoleRoleFeatureItem[]; featureIds: string[] }>(
      `${BASE_PATH}/${tenantId}/console-admin/roles/${roleId}/features`,
    );
  }

  putTenantConsoleRoleFeatures(
    tenantId: number,
    roleId: string,
    body: { items: TenantConsoleRoleFeatureItem[] },
  ): Observable<{ ok: boolean; items?: TenantConsoleRoleFeatureItem[]; featureIds?: string[] }> {
    return this.api.put(`${BASE_PATH}/${tenantId}/console-admin/roles/${roleId}/features`, body);
  }

  listTenantI18nOverrides(tenantId: number): Observable<{ items: TenantI18nOverrideRow[] }> {
    return this.api.get<{ items: TenantI18nOverrideRow[] }>(`${BASE_PATH}/${tenantId}/i18n/overrides`);
  }

  createTenantI18nOverride(
    tenantId: number,
    body: { labelKey: string; lang: string; text: string },
  ): Observable<{ id: string; labelKey: string; lang: string; text: string }> {
    return this.api.post(`${BASE_PATH}/${tenantId}/i18n/overrides`, body);
  }

  updateTenantI18nOverride(
    tenantId: number,
    overrideId: string,
    body: { text: string },
  ): Observable<{ ok: boolean }> {
    return this.api.put(`${BASE_PATH}/${tenantId}/i18n/overrides/${overrideId}`, body);
  }

  getTenantEmailSmtp(tenantId: number): Observable<TenantEmailSmtpDto> {
    return this.api.get<TenantEmailSmtpDto>(`${BASE_PATH}/${tenantId}/email-smtp`);
  }

  putTenantEmailSmtp(
    tenantId: number,
    body: {
      useCustomSmtp: boolean;
      host: string;
      port: number;
      secure: boolean;
      user: string;
      from: string;
      pass?: string;
      clearPassword?: boolean;
    },
  ): Observable<TenantEmailSmtpDto> {
    return this.api.put<TenantEmailSmtpDto>(`${BASE_PATH}/${tenantId}/email-smtp`, body);
  }

  getTenantMercadoPago(tenantId: number): Observable<TenantMercadoPagoConfigDto> {
    return this.api.get<TenantMercadoPagoConfigDto>(`${BASE_PATH}/${tenantId}/payments/mercadopago`);
  }

  putTenantMercadoPago(
    tenantId: number,
    body: { accessToken?: string; sandbox?: boolean; isEnabled?: boolean },
  ): Observable<TenantMercadoPagoConfigDto> {
    return this.api.put<TenantMercadoPagoConfigDto>(`${BASE_PATH}/${tenantId}/payments/mercadopago`, body);
  }

  listNotificationMessageTypes(tenantId: number): Observable<TenantNotificationMessageTypeRow[]> {
    return this.api.get<TenantNotificationMessageTypeRow[]>(
      `${BASE_PATH}/${tenantId}/notification-message-types`,
    );
  }

  setNotificationMessageType(
    tenantId: number,
    body: { message_type_code: string; enabled: boolean },
  ): Observable<{ messageTypeCode: string; enabled: boolean }> {
    return this.api.post<{ messageTypeCode: string; enabled: boolean }>(
      `${BASE_PATH}/${tenantId}/notification-message-types`,
      body,
    );
  }

  listNotificationTemplates(
    tenantId: number,
    messageTypeCode: string,
  ): Observable<TenantNotificationTemplateRow[]> {
    return this.api.get<TenantNotificationTemplateRow[]>(`${BASE_PATH}/${tenantId}/notification-templates`, {
      message_type_code: messageTypeCode,
    });
  }

  createNotificationTemplate(
    tenantId: number,
    body: TenantNotificationTemplateWriteDto,
  ): Observable<TenantNotificationTemplateRow> {
    return this.api.post<TenantNotificationTemplateRow>(`${BASE_PATH}/${tenantId}/notification-templates`, body);
  }

  updateNotificationTemplate(
    tenantId: number,
    templateId: string,
    body: Partial<TenantNotificationTemplateWriteDto>,
  ): Observable<TenantNotificationTemplateRow> {
    return this.api.put<TenantNotificationTemplateRow>(
      `${BASE_PATH}/${tenantId}/notification-templates/${encodeURIComponent(templateId)}`,
      body,
    );
  }

  listNotificationImportSchema(
    tenantId: number,
    messageTypeCode: string,
  ): Observable<TenantNotificationImportSchemaRow[]> {
    return this.api.get<TenantNotificationImportSchemaRow[]>(
      `${BASE_PATH}/${tenantId}/notification-import-schema`,
      { message_type_code: messageTypeCode },
    );
  }

  createNotificationImportSchema(
    tenantId: number,
    body: TenantNotificationImportSchemaWriteDto,
  ): Observable<TenantNotificationImportSchemaRow> {
    return this.api.post<TenantNotificationImportSchemaRow>(
      `${BASE_PATH}/${tenantId}/notification-import-schema`,
      body,
    );
  }

  updateNotificationImportSchema(
    tenantId: number,
    schemaId: string,
    body: Partial<TenantNotificationImportSchemaWriteDto>,
  ): Observable<TenantNotificationImportSchemaRow> {
    return this.api.put<TenantNotificationImportSchemaRow>(
      `${BASE_PATH}/${tenantId}/notification-import-schema/${encodeURIComponent(schemaId)}`,
      body,
    );
  }

  deleteNotificationImportSchema(tenantId: number, schemaId: string): Observable<{ ok: boolean }> {
    return this.api.delete<{ ok: boolean }>(
      `${BASE_PATH}/${tenantId}/notification-import-schema/${encodeURIComponent(schemaId)}`,
    );
  }

  reorderNotificationImportSchema(
    tenantId: number,
    messageTypeCode: string,
    body: { id: string; position: number }[],
  ): Observable<TenantNotificationImportSchemaRow[]> {
    return this.api.put<TenantNotificationImportSchemaRow[]>(
      `${BASE_PATH}/${tenantId}/notification-import-schema/reorder`,
      body,
      { message_type_code: messageTypeCode },
    );
  }

  downloadNotificationImportSampleCsv(tenantId: number, messageTypeCode: string): Observable<Blob> {
    const q = new URLSearchParams({ message_type_code: messageTypeCode }).toString();
    return this.http.get(
      `${this.api.buildUrl(`${BASE_PATH}/${tenantId}/notification-import-schema/sample-csv`)}?${q}`,
      { responseType: 'blob' },
    );
  }

  saveAiGeneratedNotificationTemplates(
    tenantId: number,
    body: TenantNotificationAiDraftPayload & { message_type_code: string },
  ): Observable<{ ok: boolean; templates: TenantNotificationTemplateRow[] }> {
    return this.api.post<{ ok: boolean; templates: TenantNotificationTemplateRow[] }>(
      `${BASE_PATH}/${tenantId}/notification-templates/save-ai-generated`,
      body,
    );
  }

  getNotificacionesLicenseTerms(tenantId: number): Observable<NotificacionesLicenseTermsDto> {
    return this.api.get<NotificacionesLicenseTermsDto>(
      `${BASE_PATH}/${tenantId}/notificaciones-license-terms`,
    );
  }

  putNotificacionesLicenseTerms(
    tenantId: number,
    body: PutNotificacionesLicenseTermsDto,
  ): Observable<NotificacionesLicenseTermsDto> {
    return this.api.put<NotificacionesLicenseTermsDto>(
      `${BASE_PATH}/${tenantId}/notificaciones-license-terms`,
      body,
    );
  }
}

export interface TenantNotificationMessageTypeRow {
  messageTypeCode: string;
  enabled: boolean;
  sortOrder: number;
}

/** GET/PUT notificaciones-license-terms (términos efectivos o fila activa). */
export interface NotificacionesLicenseTermsDto {
  licenseKind: string;
  maxDevices: number;
  maxMessageTypes: number;
  priceAmount: number;
  currencyCode: string;
  priceOverrideReason: string | null;
  validFrom: string | null;
  validUntil: string | null;
  notes: string | null;
  fromDefaults: boolean;
  recordId: string | null;
  id?: string;
  isActive?: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface PutNotificacionesLicenseTermsDto {
  licenseKind: string;
  maxDevices: number;
  maxMessageTypes: number;
  priceAmount: number;
  currencyCode: string;
  priceOverrideReason?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

export interface TenantNotificationTemplateRow {
  id: string;
  tenantId: string;
  messageTypeCode: string;
  channel: 'email' | 'whatsapp';
  name: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  isDefault: boolean;
  variationGroup: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TenantNotificationTemplateWriteDto {
  message_type_code?: string;
  channel: 'email' | 'whatsapp';
  name: string;
  subject?: string | null;
  body: string;
  isActive?: boolean;
  isDefault?: boolean;
  variationGroup?: string | null;
}

export interface TenantNotificationImportSchemaRow {
  id: string;
  tenantId: string;
  messageTypeCode: string;
  fieldKey: string;
  /** Índice de columna en el CSV (0 = primera columna). */
  position: number;
  /** Orden 1-based (API / licencia). */
  order?: number;
  fieldLabel: string;
  fieldType: 'string' | 'number' | 'date';
  isRequired: boolean;
  aliases: string[];
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface TenantNotificationImportSchemaWriteDto {
  message_type_code?: string;
  field_key: string;
  field_label: string;
  field_type: 'string' | 'number' | 'date';
  is_required?: boolean;
  aliases?: string[];
}

export type TenantNotificationImportSchemaPatchDto = Partial<TenantNotificationImportSchemaWriteDto>;

export interface TenantNotificationAiDraftPayload {
  email: { subject: string; body: string };
  whatsapp: { body: string }[];
}

export interface TenantNotificationAiDraftResponse extends TenantNotificationAiDraftPayload {
  _meta?: {
    provider?: string;
    variablesAvailable?: string[];
  };
}

/** Respuesta GET/PUT Mercado Pago por tenant (sin token completo). */
export interface TenantMercadoPagoConfigDto {
  source: string;
  isEnabled: boolean;
  sandbox: boolean;
  tokenConfigured: boolean;
  tokenPreview: string | null;
  platformFallbackConfigured: boolean;
  updatedAt?: string | null;
  /** false: no contratada feature club.payments.online; no configurar token hasta habilitarla. */
  paymentsOnlineEntitled?: boolean;
}

export interface TenantConsoleRoleRow {
  id: string;
  code: string;
  name: string;
  isDefault: boolean;
}

export interface TenantConsoleFeatureTreeNode {
  id: string;
  code: string;
  name: string;
  route: string | null;
  parentId: string | null;
  sortOrder: number;
  children: TenantConsoleFeatureTreeNode[];
}

export interface TenantConsoleRoleFeatureItem {
  featureId: string;
  menuSortOrder: number | null;
  showInSidebar: boolean | null;
}

export interface TenantI18nOverrideRow {
  id: string;
  labelKey: string;
  lang: string;
  langName: string;
  text: string;
  updatedAt: string | null;
}

export interface TenantEmailSmtpDto {
  useCustomSmtp: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  from: string;
  hasPassword: boolean;
}

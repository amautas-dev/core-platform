/** Evento de telemetría del producto Notificaciones (desktop) en Core. */
export interface TenantDesktopTelemetryItem {
  readonly id: string;
  readonly eventCode: string;
  readonly createdAt: string;
  readonly installationId: string | null;
  readonly level: string;
  readonly message: string;
  readonly context: Record<string, unknown> | null;
  readonly product: string | null;
}

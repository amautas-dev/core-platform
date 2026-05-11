import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse, HttpClient } from '@angular/common/http';
import { SessionDataService } from './session-data.service';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4,
}

/**
 * Interfaz para logs de errores técnicos detallados.
 */
export interface ErrorLogEntry {
  id?: number;
  nivel: 'ERROR' | 'CRITICAL';
  mensaje: string;
  contexto?: string;
  stackTrace?: string;
  errorName?: string;
  url?: string;
  metodo?: string;
  statusCode?: number;
  statusText?: string;
  requestBody?: unknown;
  responseBody?: unknown;
  userAgent?: string;
  userId?: number;
  userName?: string;
  timestamp: Date | string;
  resolved?: boolean;
  resolvedAt?: Date | string;
  resolvedBy?: number;
  notes?: string;
}

/**
 * Configuración del servicio de logging.
 */
export interface LoggingConfig {
  /** Guardar errores en base de datos */
  saveToDatabase: boolean;
  /** Enviar errores críticos por email */
  sendEmailOnCritical: boolean;
  /** Email para notificaciones de errores críticos */
  errorNotificationEmail?: string;
  /** Nivel mínimo de logging */
  minLogLevel: LogLevel;
  /** Guardar en memoria (últimos N logs) */
  keepInMemory: number;
}

/**
 * Servicio centralizado para logging estructurado con persistencia.
 * Permite diferentes niveles de log, guardado en BD y envío por email.
 */
@Injectable({ providedIn: 'root' })
export class LoggingService {
  private http = inject(HttpClient);
  private session = inject(SessionDataService);

  private config: LoggingConfig = {
    saveToDatabase: true,
    sendEmailOnCritical: true,
    errorNotificationEmail: undefined, // Configurar en app.config.ts
    minLogLevel: LogLevel.INFO,
    keepInMemory: 100,
  };

  private logs: Array<{
    level: LogLevel;
    message: string;
    context?: string;
    timestamp: Date;
    data?: unknown;
  }> = [];

  /**
   * Configura el servicio de logging.
   */
  configure(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Configura el nivel mínimo de logging.
   */
  setLogLevel(level: LogLevel): void {
    this.config.minLogLevel = level;
  }

  /**
   * Log de nivel DEBUG.
   */
  debug(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, message, context, data);
  }

  /**
   * Log de nivel INFO.
   */
  info(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.INFO, message, context, data);
  }

  /**
   * Log de nivel WARN.
   */
  warn(message: string, context?: string, data?: unknown): void {
    this.log(LogLevel.WARN, message, context, data);
  }

  /**
   * Log de nivel ERROR.
   * Captura información técnica detallada y opcionalmente guarda en BD/envía por email.
   */
  error(error: Error | HttpErrorResponse | unknown, context?: string, data?: unknown): void {
    const errorDetails = this.extractErrorDetails(error);
    const message = errorDetails.message;
    
    // Log en memoria
    this.log(LogLevel.ERROR, message, context, {
      ...(data && typeof data === 'object' ? data : {}),
      error: errorDetails,
    });

    // Guardar en BD si está configurado
    if (this.config.saveToDatabase) {
      this.saveErrorToDatabase(errorDetails, context, data).catch((err) => {
        console.error('Error al guardar log en BD:', err);
      });
    }
  }

  /**
   * Log de nivel CRITICAL.
   * Similar a ERROR pero también envía email si está configurado.
   */
  critical(error: Error | HttpErrorResponse | unknown, context?: string, data?: unknown): void {
    const errorDetails = this.extractErrorDetails(error);
    const message = errorDetails.message;
    
    // Log en memoria
    this.log(LogLevel.CRITICAL, message, context, {
      ...(data && typeof data === 'object' ? data : {}),
      error: errorDetails,
    });

    // Guardar en BD (el backend se encarga de enviar email si es crítico)
    if (this.config.saveToDatabase) {
      this.saveErrorToDatabase(errorDetails, context, data, 'CRITICAL').catch((err) => {
        console.error('Error al guardar log crítico en BD:', err);
      });
    }
  }

  /**
   * Extrae información técnica detallada del error.
   */
  private extractErrorDetails(error: Error | HttpErrorResponse | unknown): {
    message: string;
    name?: string;
    stack?: string;
    statusCode?: number;
    statusText?: string;
    url?: string;
    method?: string;
    requestBody?: unknown;
    responseBody?: unknown;
  } {
    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    if (error instanceof HttpErrorResponse) {
      return {
        message: `HTTP ${error.status}: ${error.statusText}`,
        statusCode: error.status,
        statusText: error.statusText,
        url: error.url || undefined,
        method: error.url ? 'GET' : undefined, // Se puede mejorar extrayendo del request
        requestBody: (error as any).requestBody,
        responseBody: error.error,
        stack: error.error?.stack || undefined,
      };
    }

    return {
      message: String(error),
    };
  }

  /**
   * Guarda un error en la base de datos.
   */
  private async saveErrorToDatabase(
    errorDetails: ReturnType<typeof this.extractErrorDetails>,
    context?: string,
    additionalData?: unknown,
    nivel: 'ERROR' | 'CRITICAL' = 'ERROR'
  ): Promise<void> {
    try {
      const user = this.session.user();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;
      const url = typeof window !== 'undefined' ? window.location.href : undefined;

      const logEntry: ErrorLogEntry = {
        nivel,
        mensaje: errorDetails.message,
        contexto: context,
        stackTrace: errorDetails.stack,
        errorName: errorDetails.name,
        url: errorDetails.url || url,
        metodo: errorDetails.method,
        statusCode: errorDetails.statusCode,
        statusText: errorDetails.statusText,
        requestBody: errorDetails.requestBody,
        responseBody: errorDetails.responseBody,
        userAgent,
        userId: user?.idUsuario,
        userName: user?.nombre || undefined,
        timestamp: new Date(),
        resolved: false,
      };

      // Guardar en BD usando endpoint personalizado
      await this.saveErrorLogToBackend(logEntry, nivel === 'CRITICAL');
    } catch (err) {
      // Si falla guardar en BD, al menos loguear en consola
      console.error('Error al guardar log en BD:', err);
    }
  }

  /**
   * Guarda el error log en el backend usando endpoint personalizado.
   * El backend se encarga de guardar en BD y enviar email si es crítico.
   * NO reintenta si falla - es logging, no debe interrumpir la aplicación.
   */
  private async saveErrorLogToBackend(
    logEntry: ErrorLogEntry,
    sendEmail: boolean = false
  ): Promise<void> {
    try {
      // POST a /api/error-log/save
      const url = `${environment.apiUrl}/error-log/save`;
      
      const payload = {
        ...logEntry,
        timestamp: logEntry.timestamp instanceof Date 
          ? logEntry.timestamp.toISOString() 
          : logEntry.timestamp,
        sendEmail, // Indica al backend si debe enviar email (solo para CRITICAL)
      };

      // Agregar header especial para que el interceptor NO reintente
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; message: string; data: { id: number; emailSent: boolean } }>(
          url, 
          payload,
          {
            // Header que el retryInterceptor detecta para saltar reintentos
            headers: {
              'X-Skip-Retry': 'true',
            },
          }
        )
      );

      if (!response.success) {
        console.error('Error al guardar log en backend:', response.message);
      } else {
        console.log('Error log guardado:', response.data);
      }
    } catch (err) {
      // Silenciosamente fallar - no queremos que el logging cause más errores
      console.warn('No se pudo guardar log en backend (esto es normal si el servidor está caído):', err);
      // NO lanzar error, NO reintentar - el logging no debe afectar la aplicación
    }
  }

  /**
   * Método interno para logging.
   */
  private log(level: LogLevel, message: string, context?: string, data?: unknown): void {
    if (level < this.config.minLogLevel) {
      return;
    }

    const logEntry = {
      level,
      message,
      context,
      timestamp: new Date(),
      data,
    };

    this.logs.push(logEntry);

    // Log a consola según el nivel
    const logMessage = context 
      ? `[${context}] ${message}`
      : message;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(logMessage, data || '');
        break;
    }

    // Mantener solo los últimos N logs en memoria
    if (this.logs.length > this.config.keepInMemory) {
      this.logs.shift();
    }
  }

  /**
   * Obtiene los logs almacenados en memoria.
   */
  getLogs(): Array<{
    level: LogLevel;
    message: string;
    context?: string;
    timestamp: Date;
    data?: unknown;
  }> {
    return [...this.logs];
  }

  /**
   * Obtiene errores guardados en la base de datos.
   * @param filters - Filtros opcionales (resueltos, nivel, fecha, etc.)
   */
  getErrorLogs(filters?: {
    resolved?: boolean;
    nivel?: 'ERROR' | 'CRITICAL';
    desde?: Date;
    hasta?: Date;
    userId?: number;
  }): Promise<ErrorLogEntry[]> {
    const dbFilters: any[] = [];

    if (filters?.resolved !== undefined) {
      dbFilters.push({ field: 'resolved', op: 'eq', value: filters.resolved ? 1 : 0 });
    }

    if (filters?.nivel) {
      dbFilters.push({ field: 'nivel', op: 'eq', value: filters.nivel });
    }

    if (filters?.userId) {
      dbFilters.push({ field: 'userId', op: 'eq', value: filters.userId });
    }

    if (filters?.desde) {
      dbFilters.push({ field: 'timestamp', op: 'ge', value: filters.desde.toISOString() });
    }

    if (filters?.hasta) {
      dbFilters.push({ field: 'timestamp', op: 'le', value: filters.hasta.toISOString() });
    }

    // Usar el endpoint estándar de PHP-CRUD-API para consultar
    const url = `${environment.apiUrl}/records/error_log`;
    const params: any = {
      order: 'timestamp,desc',
    };

    if (filters?.resolved !== undefined) {
      params.filter = `resolved,eq,${filters.resolved ? 1 : 0}`;
    }

    if (filters?.nivel) {
      params.filter = params.filter 
        ? `${params.filter}&nivel,eq,${filters.nivel}`
        : `nivel,eq,${filters.nivel}`;
    }

    if (filters?.userId) {
      params.filter = params.filter
        ? `${params.filter}&userId,eq,${filters.userId}`
        : `userId,eq,${filters.userId}`;
    }

    return firstValueFrom(
      this.http.get<{ records: ErrorLogEntry[] }>(url, { params })
    ).then(response => response.records);
  }

  /**
   * Marca un error como resuelto.
   */
  async resolveError(errorId: number, notes?: string): Promise<void> {
    const user = this.session.user();
    const url = `${environment.apiUrl}/records/error_log/${errorId}`;
    
    await firstValueFrom(
      this.http.put(url, {
        resolved: true,
        resolvedAt: new Date().toISOString(),
        resolvedBy: user?.idUsuario,
        notes,
      })
    );
  }

  /**
   * Limpia los logs almacenados en memoria.
   */
  clearLogs(): void {
    this.logs = [];
  }

  /**
   * Método de prueba para generar un error crítico.
   * Útil para verificar que el sistema de logging funciona correctamente.
   * 
   * @param testType - Tipo de error a simular: 'error' | 'critical' | 'http'
   */
  async testErrorLogging(testType: 'error' | 'critical' | 'http' = 'critical'): Promise<void> {
    const testContext = 'LoggingService.testErrorLogging';
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      testType,
    };

    switch (testType) {
      case 'error':
        // Error de aplicación normal
        const appError = new Error('Error de prueba: Este es un error de aplicación simulado');
        appError.stack = `Error: Error de prueba: Este es un error de aplicación simulado
    at LoggingService.testErrorLogging (logging.service.ts:${Math.floor(Math.random() * 1000)}:1)
    at Object.callback (test.component.ts:1:1)
    at ZoneDelegate.invoke (zone.js:372:1)
    at Zone.run (zone.js:134:1)`;
        this.error(appError, testContext, testData);
        break;

      case 'critical':
        // Error crítico (se guarda en BD y envía email)
        const criticalError = new Error('ERROR CRÍTICO DE PRUEBA: Este es un error crítico simulado para testing');
        criticalError.name = 'CriticalTestError';
        criticalError.stack = `CriticalTestError: ERROR CRÍTICO DE PRUEBA: Este es un error crítico simulado para testing
    at LoggingService.testErrorLogging (logging.service.ts:${Math.floor(Math.random() * 1000)}:1)
    at Object.callback (test.component.ts:1:1)
    at ZoneDelegate.invoke (zone.js:372:1)
    at Zone.run (zone.js:134:1)
    at NgZone.run (core.ts:281:1)
    at ApplicationRef.tick (core.ts:1234:1)`;
        this.critical(criticalError, testContext, {
          ...testData,
          motivo: 'Prueba del sistema de logging',
          accion: 'Verificar guardado en BD y envío de email',
        });
        break;

      case 'http':
        // Error HTTP simulado
        const httpError = new HttpErrorResponse({
          error: { message: 'Error de prueba HTTP', code: 'TEST_ERROR' },
          status: 500,
          statusText: 'Internal Server Error',
          url: 'https://dev.distribuidoraali.com.ar/api/test/endpoint',
        });
        (httpError as any).method = 'POST';
        (httpError as any).requestBody = { test: true, data: 'test data' };
        this.critical(httpError, testContext, {
          ...testData,
          endpoint: '/api/test/endpoint',
        });
        break;
    }
  }
}

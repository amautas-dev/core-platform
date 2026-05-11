import { Injectable, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, throwError } from 'rxjs';
import { LoggingService } from './logging.service';

/**
 * Servicio centralizado para el manejo de errores HTTP y de aplicación.
 * Proporciona mensajes user-friendly y logging estructurado.
 */
@Injectable({ providedIn: 'root' })
export class ErrorHandlingService {
  private snackBar = inject(MatSnackBar);
  private logger = inject(LoggingService);

  /**
   * Maneja un error HTTP y retorna un Observable que emite el error.
   * @param error - Error HTTP recibido
   * @param context - Contexto opcional para logging (nombre del servicio/método)
   * @param showUserMessage - Si es true, muestra mensaje al usuario
   * @param isCritical - Si es true, se marca como error crítico (envía email)
   */
  handleError(
    error: HttpErrorResponse,
    context?: string,
    showUserMessage: boolean = true,
    isCritical: boolean = false
  ): Observable<never> {
    // Determinar si es crítico (5xx o errores específicos)
    const shouldBeCritical = isCritical || 
      (error.status >= 500 && error.status < 600) ||
      error.status === 0; // Network errors

    // Log del error (crítico o normal)
    if (shouldBeCritical) {
      this.logger.critical(error, context, {
        requestUrl: error.url,
        requestMethod: (error as any).method || 'GET',
      });
    } else {
      this.logger.error(error, context, {
        requestUrl: error.url,
        requestMethod: (error as any).method || 'GET',
      });
    }

    // Mensaje user-friendly
    if (showUserMessage) {
      const message = this.getUserFriendlyMessage(error);
      this.snackBar.open(message, 'Cerrar', {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      });
    }

    return throwError(() => error);
  }

  /**
   * Obtiene un mensaje user-friendly basado en el código de error HTTP.
   */
  private getUserFriendlyMessage(error: HttpErrorResponse): string {
    switch (error.status) {
      case 0:
        return 'Error de conexión. Verifica tu conexión a internet.';
      
      case 400:
        return 'Datos inválidos. Por favor, verifica la información ingresada.';
      
      case 401:
        return 'Sesión expirada. Por favor, inicia sesión nuevamente.';
      
      case 403:
        return 'No tienes permisos para realizar esta acción.';
      
      case 404:
        return 'Recurso no encontrado.';
      
      case 409:
        return 'Conflicto: El recurso ya existe o está en uso.';
      
      case 422:
        return 'Error de validación. Verifica los datos ingresados.';
      
      case 500:
        return 'Error del servidor. Por favor, intenta más tarde.';
      
      case 503:
        return 'Servicio no disponible temporalmente. Intenta más tarde.';
      
      default:
        return error.error?.message || 'Ocurrió un error inesperado.';
    }
  }

  /**
   * Maneja errores de aplicación (no HTTP).
   * @param error - Error de aplicación
   * @param context - Contexto opcional
   * @param isCritical - Si es true, se marca como error crítico (envía email)
   */
  handleApplicationError(error: Error, context?: string, isCritical: boolean = false): void {
    if (isCritical) {
      this.logger.critical(error, context);
    } else {
      this.logger.error(error, context);
    }
    
    this.snackBar.open(
      error.message || 'Ocurrió un error inesperado.',
      'Cerrar',
      {
        duration: 5000,
        horizontalPosition: 'end',
        verticalPosition: 'bottom',
      }
    );
  }
}



import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ErrorHandlingService } from '../services/error-handling.service';

/**
 * Interceptor para manejo global de errores HTTP.
 * Captura errores HTTP y los procesa mediante ErrorHandlingService.
 * EXCLUYE endpoints de logging para evitar loops infinitos.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const errorService = inject(ErrorHandlingService);
  const url = req.url.toLowerCase();

  // Endpoints que NO deben ser procesados por el errorInterceptor
  // (para evitar loops infinitos cuando el logging falla)
  // NOTA: Login SÍ debe procesar errores para mostrar mensajes al usuario
  const skipErrorHandlingPatterns = [
    'error-log',        // Endpoints de logging (evitar loops)
    'save.php',         // Cualquier save.php (evitar loops)
    'custom/error-log', // Endpoints custom de error (evitar loops)
    // NO excluir login.php ni auth/login - necesitan mostrar errores al usuario
  ];

  const shouldSkipErrorHandling = skipErrorHandlingPatterns.some(pattern => url.includes(pattern));
  
  // Verificar si es un endpoint de login/auth (necesita procesamiento especial)
  const isLoginEndpoint = url.includes('login.php') || url.includes('auth/login') || url.includes('platform/auth') || url.includes('custom/auth');

  return next(req).pipe(
    catchError((error: unknown) => {
      // Si es un endpoint de logging, NO procesar el error (evitar loop)
      if (shouldSkipErrorHandling) {
        // Solo loguear en consola, NO llamar a ErrorHandlingService
        if (error instanceof HttpErrorResponse) {
          console.warn('Error en endpoint de logging (no se procesa para evitar loops):', error.status, error.url);
        }
        // Re-lanzar el error sin procesarlo
        return throwError(() => error);
      }
      
      // Si es login, procesar el error PERO sin logging (evitar loop)
      if (isLoginEndpoint && error instanceof HttpErrorResponse) {
        // Procesar error de login sin llamar al logger (evitar loop)
        const context = `${req.method} ${req.url}`;
        // Solo mostrar mensaje al usuario, NO loguear
        return errorService.handleError(error, context, true, false); // isCritical = false
      }

      if (error instanceof HttpErrorResponse) {
        // Obtener contexto del request
        const context = `${req.method} ${req.url}`;
        
        // Determinar si es crítico (5xx, network errors, etc.)
        const isCritical = error.status >= 500 || error.status === 0;
        
        // Agregar información del request al error para logging detallado
        (error as any).method = req.method;
        (error as any).requestBody = req.body;
        
        // Manejar error (ya muestra mensaje al usuario si es necesario)
        return errorService.handleError(error, context, true, isCritical);
      }
      
      // Si no es HttpErrorResponse, re-lanzar como crítico
      return errorService.handleError(
        new HttpErrorResponse({ error, status: 0, statusText: 'Unknown Error' }),
        'Unknown',
        true,
        true // Es crítico porque es un error desconocido
      );
    })
  );
};



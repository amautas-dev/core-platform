import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../environments/environment';

/**
 * Interceptor para reintentar requests HTTP fallidos.
 * 
 * POLÍTICA ACTUAL: NO REINTENTA NADA por defecto.
 * Solo reintenta si explícitamente se solicita mediante header.
 * 
 * Esto evita loops infinitos y spam de requests.
 * Si necesitas retry en un caso específico, agrega el header 'X-Allow-Retry: true'
 */
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  const url = req.url.toLowerCase();
  
  // Verificar si el request tiene el header para saltar retry (prioridad máxima)
  const skipRetryHeader = req.headers.get('X-Skip-Retry');
  if (skipRetryHeader === 'true') {
    return next(req); // NO reintentar
  }
  
  // Endpoints que NUNCA deben reintentarse (lista exhaustiva)
  const noRetryPatterns = [
    'error-log',        // Logging
    'save.php',         // Cualquier save
    'login.php',        // Login
    '/auth/',           // Auth
    'custom/error',     // Custom error
    'custom/auth',      // Custom auth
    'auth/login',       // Auth login
  ];
  
  // Si es un endpoint crítico, NO reintentar
  if (noRetryPatterns.some(pattern => url.includes(pattern))) {
    return next(req); // NO reintentar
  }
  
  // POLÍTICA: Por defecto NO reintentar nada
  // Solo reintentar si explícitamente se solicita con header 'X-Allow-Retry'
  const allowRetryHeader = req.headers.get('X-Allow-Retry');
  
  if (allowRetryHeader !== 'true') {
    // Por defecto: NO reintentar
    return next(req);
  }
  
  // Solo si tiene el header X-Allow-Retry: true, entonces reintentar 1 vez
  // Esto es para casos muy específicos donde realmente se necesita retry
  // Por ahora, incluso con el header, NO reintentamos (más seguro)
  // Si en el futuro necesitas retry, descomenta el código siguiente:
  
  /*
  import { retry, timer, throwError } from 'rxjs';
  
  const maxRetries = 1;
  const retryDelay = 1000;
  
  return next(req).pipe(
    retry({
      count: maxRetries,
      delay: (error: HttpErrorResponse) => {
        if (error.status >= 500 && error.status < 600) {
          return timer(retryDelay);
        }
        return throwError(() => error);
      },
    })
  );
  */
  
  // Por ahora, incluso con X-Allow-Retry, no reintentamos
  return next(req);
};



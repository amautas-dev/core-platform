import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { LoadingService } from '../services/loading.service';

/**
 * Interceptor para gestionar el estado de carga global.
 * Automáticamente inicia y detiene el loading para cada request HTTP.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Generar ID único para esta operación
  const operationId = `${req.method}_${req.url}_${Date.now()}`;
  
  // Iniciar loading
  loadingService.start(operationId);

  return next(req).pipe(
    finalize(() => {
      // Detener loading cuando la operación termine (éxito o error)
      loadingService.stop(operationId);
    })
  );
};










































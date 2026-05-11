import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SessionDataService } from '../services/session-data.service';
import { PlatformRoutePathsService } from '../routing/platform-route-paths.service';

/**
 * Guard que protege rutas exclusivas para administradores de AMAUTAS
 * Solo permite acceso a usuarios con isAmautasAdmin === true
 */
export const devAdminGuard: CanActivateFn = () => {
  const session = inject(SessionDataService);
  const router = inject(Router);
  const paths = inject(PlatformRoutePathsService);

  // Verificar isAmautasAdmin en lugar de idRol
  if (session.isAmautasAdmin) {
    return true;
  }

  // Redirigir a dashboard si no tiene permisos
  void router.navigate([paths.dashboard()]);
  return false;
};

import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { SessionDataService } from '../../core/services/session-data.service';

@Injectable({ providedIn: 'root' })
export class RoleRedirectService {
  private router = inject(Router);
  private session = inject(SessionDataService);

  redirectAfterLogin(): void {
    // Intentar obtener el rol del estado de sesión o del userData
    let rol = this.session.rolId;
    
    // Si el rol no está disponible en rolId, intentar obtenerlo del userData
    if (!rol || rol === 0) {
      const userData = this.session.userData;
      rol = userData?.idRol ?? 0;
    }

    // Determinar la ruta según el rol
    let route = '/dashboard';
    switch (rol) {
      case 1:
        route = '/dashboard/admin';
        break;
      case 2:
        route = '/dashboard/gestion';
        break;
      case 3:
        route = '/dashboard/vendedor';
        break;
      case 4:
        route = '/dashboard/repartidor';
        break;
      case 5:
        route = '/dashboard/vendedor';
        break;
      default:
        route = '/dashboard';
        break;
    }

    // Intentar navegar, si falla usar location.href como fallback
    this.router.navigateByUrl(route).catch(() => {
      // Fallback si la navegación falla
      window.location.href = route;
    });
  }
}

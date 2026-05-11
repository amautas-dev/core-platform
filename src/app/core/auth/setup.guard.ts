import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { SetupService } from '../services/setup.service';

/**
 * Guard que verifica si el sistema está configurado
 * Si no está configurado, redirige a /setup
 * Si está configurado, permite continuar
 */
export const setupGuard: CanActivateFn = async () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  const isConfigured = await setupService.isSystemConfigured();
  
  if (!isConfigured) {
    router.navigate(['/setup']);
    return false;
  }

  return true;
};

/**
 * Guard inverso: solo permite acceso a /setup si NO está configurado
 */
export const setupPageGuard: CanActivateFn = async () => {
  const setupService = inject(SetupService);
  const router = inject(Router);

  const isConfigured = await setupService.isSystemConfigured();
  
  if (isConfigured) {
    // Si ya está configurado, redirigir al login
    router.navigate(['/login']);
    return false;
  }

  return true;
};

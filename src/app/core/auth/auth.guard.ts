import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SessionDataService } from '../services/session-data.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/login');
  return false;
};

export const authMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/login');
  return false;
};

export const roleGuard = (roles: number[]): CanActivateFn => {
  return () => {
    const session = inject(SessionDataService);
    const router = inject(Router);

    if (!session.idUsuario) {
      router.navigateByUrl('/login');
      return false;
    }

    if (!roles.includes(session.rolId ?? 0)) {
      router.navigateByUrl('/dashboard');
      return false;
    }

    return true;
  };
};

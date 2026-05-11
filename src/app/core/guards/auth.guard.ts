import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, catchError, of } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { DbTranslationsLoaderService } from '../i18n/db-translations.loader';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const dbLoader = inject(DbTranslationsLoaderService);
  if (!auth.isLoggedIn()) {
    router.navigateByUrl('/login');
    return false;
  }
  // Esperar a que las traducciones de BD estén fusionadas antes de mostrar el shell (menú, etc.)
  return dbLoader.loadFromDb().pipe(
    map(() => true),
    catchError(() => of(true))
  );
};

export const authMatchGuard: CanMatchFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (auth.isLoggedIn()) return true;
  router.navigateByUrl('/login');
  return false;
};

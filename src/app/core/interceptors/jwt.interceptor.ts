import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  // Con FormData/multipart, `setHeaders` puede interferir con el boundary del Content-Type.
  // Usar `headers.set` sobre los headers existentes preserva el resto de cabeceras.
  let clone = req;
  if (token) {
    clone = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
  }

  return next(clone).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        auth.logout();
        router.navigateByUrl('/login');
      }
      return throwError(() => err);
    })
  );
};

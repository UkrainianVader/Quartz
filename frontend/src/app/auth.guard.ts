import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.me().pipe(
    map(() => true),
    catchError(() => of(router.parseUrl('/login')))
  );
};

export const guestGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.me().pipe(
    map(() => router.parseUrl('/inventory')),
    catchError(() => of(true))
  );
};

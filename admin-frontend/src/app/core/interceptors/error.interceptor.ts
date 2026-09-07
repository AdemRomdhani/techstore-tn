import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AdminAuthService } from '../services/admin-auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AdminAuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !req.url.includes('/admin-auth/')) {
        if (!auth.isRefreshing) {
          auth.isRefreshing = true;
          const refreshToken = auth.getRefreshToken();

          if (refreshToken) {
            return auth.refreshAccessToken().pipe(
              switchMap(() => {
                const newToken = auth.getToken();
                if (newToken) {
                  req = req.clone({
                    setHeaders: { Authorization: `Bearer ${newToken}` },
                  });
                }
                return next(req);
              }),
              catchError((err) => {
                auth.isRefreshing = false;
                auth.logout();
                return throwError(() => err);
              })
            );
          } else {
            auth.logout();
          }
        }
      }

      return throwError(() => error);
    })
  );
};

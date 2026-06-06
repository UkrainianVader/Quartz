import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, BehaviorSubject } from 'rxjs';

export interface AuthUser {
  id: number;
  username: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private authUser$ = new BehaviorSubject<AuthUser | null>(null);
  private initialized = false;

  login(username: string, password: string): Observable<AuthUser> {
    return this.http.post<{ user: AuthUser }>('/api/auth/login', { username, password }, { withCredentials: true })
      .pipe(map((response) => response.user));
  }

  me(): Observable<AuthUser> {
    if (this.authUser$.value === null && !this.initialized) {
      // Fetch immediately if not yet initialized
      this.http.get<{ user: AuthUser }>('/api/auth/me', { withCredentials: true })
        .pipe(
          map((response) => response.user),
          catchError(() => of(null))
        )
        .subscribe({
          next: (user) => this.authUser$.next(user),
          error: () => this.authUser$.next(null)
        });
    }
    return this.authUser$.asObservable().pipe(
      map(user => {
        if (user === null) {
          throw new Error('Not authenticated');
        }
        return user;
      })
    );
  }

  initialize(): Observable<AuthUser | null> {
    this.initialized = true;
    return this.http.get<{ user: AuthUser }>('/api/auth/me', { withCredentials: true })
      .pipe(
        map((response) => {
          this.authUser$.next(response.user);
          return response.user;
        }),
        catchError(() => {
          this.authUser$.next(null);
          return of(null);
        })
      );
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true });
  }
}
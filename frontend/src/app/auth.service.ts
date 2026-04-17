import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

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

  login(username: string, password: string): Observable<AuthUser> {
    return this.http.post<{ user: AuthUser }>('/api/auth/login', { username, password }, { withCredentials: true })
      .pipe(map((response) => response.user));
  }

  me(): Observable<AuthUser> {
    return this.http.get<{ user: AuthUser }>('/api/auth/me', { withCredentials: true })
      .pipe(map((response) => response.user));
  }

  logout(): Observable<void> {
    return this.http.post<void>('/api/auth/logout', {}, { withCredentials: true });
  }
}
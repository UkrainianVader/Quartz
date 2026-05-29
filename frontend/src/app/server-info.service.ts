import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ServerInfo {
  port: number;
  localIps: string[];
  localUrls: string[];
  localhostUrl: string;
  primaryUrl: string;
}

@Injectable({
  providedIn: 'root'
})
export class ServerInfoService {
  private readonly http = inject(HttpClient);

  getServerInfo(): Observable<ServerInfo> {
    return this.http.get<ServerInfo>('/api/server-info');
  }
}
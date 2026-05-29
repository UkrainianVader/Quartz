import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface MobileCompanionInfo {
  available: boolean;
  fileName: string | null;
  downloadPath: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MobileCompanionService {
  private readonly http = inject(HttpClient);

  getInfo(): Observable<MobileCompanionInfo> {
    return this.http.get<MobileCompanionInfo>('/api/mobile-companion');
  }
}
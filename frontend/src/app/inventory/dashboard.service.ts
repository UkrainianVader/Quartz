import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthUser } from '../auth.service';

export interface DashboardItem {
  id: number;
  name: string;
  type: string;
  serial: string;
  status: string;
  description: string;
}

export interface DashboardUser {
  id: number;
  username: string;
  role: string;
}

export interface WarehouseReport {
  totalEquipment: number;
  damagedEquipment: number;
  assignedEquipment: number;
  freeEquipment: number;
  equipment: DashboardItem[];
}

export interface DashboardResponse {
  user: AuthUser;
  items: DashboardItem[];
  users: DashboardUser[];
  assignedEquipmentIds: number[];
  assignmentByEquipmentId: Record<string, string | null>;
  warehouseReport: WarehouseReport | null;
}

export interface ComponentFormValue {
  id?: number;
  name: string;
  type: string;
  serial: string;
  status: string;
  description: string;
}

export interface UserFormValue {
  username: string;
  password: string;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly http = inject(HttpClient);

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>('/api/dashboard', { withCredentials: true });
  }

  getWarehouseReport(): Observable<WarehouseReport> {
    return this.http.get<{ report: WarehouseReport }>('/api/report/warehouse', { withCredentials: true })
      .pipe(map((response) => response.report));
  }

  addComponent(value: ComponentFormValue): Observable<void> {
    return this.http.post<void>('/api/components/add', value, { withCredentials: true });
  }

  updateComponent(value: ComponentFormValue): Observable<void> {
    return this.http.post<void>('/api/components/update', value, { withCredentials: true });
  }

  fixComponent(id: number): Observable<void> {
    return this.http.post<void>('/api/components/fix', { id }, { withCredentials: true });
  }

  removeComponent(id: number): Observable<void> {
    return this.http.post<void>('/api/components/remove', { id }, { withCredentials: true });
  }

  assignComponent(id: number, userId: number): Observable<void> {
    return this.http.post<void>('/api/assignments/assign', { id, userId }, { withCredentials: true });
  }

  unassignComponent(id: number): Observable<void> {
    return this.http.post<void>('/api/assignments/unassign', { id }, { withCredentials: true });
  }

  returnComponent(id: number): Observable<void> {
    return this.http.post<void>('/api/assignments/return', { id }, { withCredentials: true });
  }

  returnBrokenComponent(id: number): Observable<void> {
    return this.http.post<void>('/api/assignments/return-broken', { id }, { withCredentials: true });
  }

  addUser(value: UserFormValue): Observable<void> {
    return this.http.post<void>('/api/users/add', value, { withCredentials: true });
  }

  deleteUser(id: number): Observable<void> {
    return this.http.post<void>('/api/users/delete', { id }, { withCredentials: true });
  }
}
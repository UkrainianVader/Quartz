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
  tutorId: number | null;
}

export interface WarehouseReport {
  totalEquipment: number;
  damagedEquipment: number;
  assignedEquipment: number;
  freeEquipment: number;
  equipment: DashboardItem[];
}

export interface UserReportHistoryEntry {
  id: number;
  equipmentId: number;
  name: string;
  type: string;
  serial: string;
  status: string;
  description: string;
  dateTaken: string;
  dateReturned: string | null;
  returnedBroken: boolean;
}

export interface UserReport {
  user: DashboardUser;
  currentComponents: DashboardItem[];
  history: UserReportHistoryEntry[];
  totals: {
    totalAssignments: number;
    activeAssignments: number;
    returnedAssignments: number;
    brokenReturns: number;
  };
}

export interface DashboardResponse {
  user: AuthUser;
  items: DashboardItem[];
  users: DashboardUser[];
  assignedEquipmentIds: number[];
  assignmentByEquipmentId: Record<string, string | null>;
  assignmentUserIdByEquipmentId: Record<string, number | null>;
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

  getUserReport(userId: number): Observable<UserReport> {
    return this.http.get<{ report: UserReport }>(`/api/report/user/${userId}`, { withCredentials: true })
      .pipe(map((response) => response.report));
  }

  addComponent(value: ComponentFormValue): Observable<void> {
    return this.http.post<void>('/api/components/add', value, { withCredentials: true });
  }

  searchComponents(query: string, status: string, type: string): Observable<DashboardItem[]> {
    return this.http.get<{ items: DashboardItem[] }>('/api/components/search', {
      withCredentials: true,
      params: {
        query,
        status,
        type
      }
    }).pipe(map((response) => response.items));
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

  bulkAssignComponents(ids: number[], userId: number): Observable<{ message: string; assigned: number[]; skipped: number[] }> {
    return this.http.post<{ message: string; assigned: number[]; skipped: number[] }>('/api/assignments/bulk-assign', { ids, userId }, { withCredentials: true });
  }

  bulkUnassignComponents(ids: number[]): Observable<{ message: string; unassigned: number[]; skipped: number[] }> {
    return this.http.post<{ message: string; unassigned: number[]; skipped: number[] }>('/api/assignments/bulk-unassign', { ids }, { withCredentials: true });
  }

  bulkReturnComponents(ids: number[]): Observable<{ message: string; returned: number[]; skipped: number[] }> {
    return this.http.post<{ message: string; returned: number[]; skipped: number[] }>('/api/assignments/bulk-return', { ids }, { withCredentials: true });
  }

  bulkReturnBrokenComponents(ids: number[]): Observable<{ message: string; returned: number[]; skipped: number[] }> {
    return this.http.post<{ message: string; returned: number[]; skipped: number[] }>('/api/assignments/bulk-return-broken', { ids }, { withCredentials: true });
  }

  bulkAssignStudentsToTutor(studentIds: number[], tutorId: number): Observable<{ message: string; assigned: number[]; skipped: number[] }> {
    return this.http.post<{ message: string; assigned: number[]; skipped: number[] }>('/api/users/bulk-assign-tutor', { studentIds, tutorId }, { withCredentials: true });
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

  resetDatabase(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>('/api/db/reset', {}, { withCredentials: true });
  }
}
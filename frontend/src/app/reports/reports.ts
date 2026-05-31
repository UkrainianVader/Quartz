import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DashboardService, DashboardUser, UserReport, WarehouseReport } from '../inventory/dashboard.service';

@Component({
  selector: 'app-reports',
  imports: [CommonModule],
  templateUrl: './reports.html',
  styleUrl: './reports.css',
})
export class Reports implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  protected loading = true;
  protected errorMessage = '';
  protected warehouseReport: WarehouseReport | null = null;
  protected userReport: UserReport | null = null;
  protected users: DashboardUser[] = [];
  protected currentUserId = 0;
  protected currentUserRole = '';
  protected selectedUserId = 0;

  ngOnInit(): void {
    this.dashboardService.getDashboard().subscribe({
      next: (dashboard) => {
        this.users = dashboard.users ?? [];
        this.currentUserId = dashboard.user.id;
        this.currentUserRole = dashboard.user.role;
        this.selectedUserId = this.currentUserId;

        if (this.currentUserRole === 'admin') {
          this.dashboardService.getWarehouseReport().subscribe({
            next: (warehouse) => {
              this.warehouseReport = warehouse;
            }
          });
        }

        this.loading = false;
        this.loadUserReport(this.selectedUserId);
      },
      error: (error: unknown) => {
        this.loading = false;
        if (error instanceof Error) {
          this.errorMessage = error.message;
          return;
        }

        this.errorMessage = 'Failed to load report';
      }
    });
  }

  protected onUserChange(value: string): void {
    const nextUserId = Number(value);
    if (!Number.isInteger(nextUserId) || nextUserId <= 0 || nextUserId === this.selectedUserId) {
      return;
    }

    this.selectedUserId = nextUserId;
    this.loadUserReport(nextUserId);
  }

  protected canSelectOtherUsers(): boolean {
    return this.currentUserRole === 'admin';
  }

  protected isCurrentUser(userId: number): boolean {
    return Number(userId) === Number(this.currentUserId);
  }

  protected trackById(_: number, item: { id: number }): number {
    return item.id;
  }

  private loadUserReport(userId: number): void {
    this.dashboardService.getUserReport(userId).subscribe({
      next: (report) => {
        this.userReport = report;
      },
      error: (error: unknown) => {
        if (error instanceof Error) {
          this.errorMessage = error.message;
          return;
        }

        this.errorMessage = 'Failed to load user report';
      }
    });
  }
}

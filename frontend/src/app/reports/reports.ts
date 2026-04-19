import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { DashboardService, WarehouseReport } from '../inventory/dashboard.service';

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
  protected report: WarehouseReport | null = null;

  ngOnInit(): void {
    this.dashboardService.getWarehouseReport().subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
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

  protected trackById(_: number, item: { id: number }): number {
    return item.id;
  }
}

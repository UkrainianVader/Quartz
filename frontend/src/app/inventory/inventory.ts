import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, takeUntil } from 'rxjs';
import { AuthService } from '../auth.service';
import { DashboardItem, DashboardResponse, DashboardService, DashboardUser, WarehouseReport } from './dashboard.service';

@Component({
  selector: 'app-inventory',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory.html',
  styleUrls: ['./inventory.css'],
})
export class Inventory implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dashboardService = inject(DashboardService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected loading = true;
  protected errorMessage = '';
  protected actionMessage = '';
  protected dashboard: DashboardResponse | null = null;
  protected filteredItems: DashboardItem[] = [];

  private readonly destroy$ = new Subject<void>();

  protected showAdminPanel = false;
  protected showEditModal = false;
  protected showAddModal = false;
  protected showAssignModal = false;
  protected showAddUserModal = false;
  protected showDeleteUserModal = false;
  protected showReportModal = false;
  protected showFilters = false;
  protected showResetDbConfirm = false;
  protected activeAdminTab: 'users' | 'equipment' | 'db' = 'users';

  protected readonly filterForm = this.fb.nonNullable.group({
    searchQuery: [''],
    statusFilter: [''],
    typeFilter: ['']
  });

  protected readonly editForm = this.fb.nonNullable.group({
    id: [0, [Validators.required]],
    name: ['', [Validators.required]],
    type: ['контролер', [Validators.required]],
    serial: ['', [Validators.required]],
    status: ['вільне', [Validators.required]],
    description: ['']
  });

  protected readonly addForm = this.fb.nonNullable.group({
    name: ['', [Validators.required]],
    type: ['контролер', [Validators.required]],
    serial: ['', [Validators.required]],
    status: ['вільне', [Validators.required]],
    description: ['']
  });

  protected readonly assignForm = this.fb.nonNullable.group({
    itemId: [0, [Validators.required]],
    userId: [0, [Validators.required]]
  });

  protected readonly addUserForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    role: ['user', [Validators.required]]
  });

  protected readonly deleteUserForm = this.fb.nonNullable.group({
    userId: [0, [Validators.required]]
  });

  ngOnInit(): void {
    this.filterForm.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        takeUntil(this.destroy$)
      )
      .subscribe(() => this.runServerSearch());

    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  protected loadDashboard(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.dashboardService.getDashboard().subscribe({
      next: (dashboard) => {
        this.dashboard = dashboard;
        this.filteredItems = dashboard.items ?? [];
        this.loading = false;

        const firstAssignableUser = this.getAssignableUsers()[0];
        if (firstAssignableUser) {
          this.deleteUserForm.patchValue({ userId: firstAssignableUser.id });
        }

        this.cdr.detectChanges();
      },
      error: (error: unknown) => {
        this.loading = false;
        if (error instanceof Error) {
          this.errorMessage = error.message;
        } else {
          this.errorMessage = 'Failed to load dashboard';
        }

        this.cdr.detectChanges();

        void this.router.navigateByUrl('/login');
      }
    });
  }

  protected logout(): void {
    this.authService.logout().subscribe({
      next: () => {
        void this.router.navigateByUrl('/login');
      }
    });
  }

  protected openAdminPanel(): void {
    this.activeAdminTab = 'users';
    this.showAdminPanel = true;
  }

  protected closeAdminPanel(): void {
    this.showAdminPanel = false;
  }

  protected setAdminTab(tab: 'users' | 'equipment' | 'db'): void {
    this.activeAdminTab = tab;
  }

  protected openEditModal(item: DashboardItem): void {
    this.editForm.reset({
      id: item.id,
      name: item.name,
      type: item.type,
      serial: item.serial,
      status: item.status,
      description: item.description
    });
    this.showEditModal = true;
  }

  protected openAddModal(): void {
    this.addForm.reset({
      name: '',
      type: 'контролер',
      serial: '',
      status: 'вільне',
      description: ''
    });
    this.showAddModal = true;
  }

  protected openAssignModal(item: DashboardItem): void {
    const firstAssignableUser = this.getAssignableUsers()[0];

    this.assignForm.reset({
      itemId: item.id,
      userId: firstAssignableUser ? firstAssignableUser.id : 0
    });
    this.showAssignModal = true;
  }

  protected openAddUserModal(): void {
    this.addUserForm.reset({
      username: '',
      password: '',
      role: 'user'
    });
    this.showAddUserModal = true;
  }

  protected openDeleteUserModal(): void {
    const firstAssignableUser = this.getAssignableUsers()[0];

    this.deleteUserForm.reset({
      userId: firstAssignableUser ? firstAssignableUser.id : 0
    });
    this.showDeleteUserModal = true;
  }

  protected openReportModal(): void {
    this.showReportModal = true;
  }

  protected closeAllModals(): void {
    this.showEditModal = false;
    this.showAddModal = false;
    this.showAssignModal = false;
    this.showAddUserModal = false;
    this.showDeleteUserModal = false;
    this.showReportModal = false;
    this.showResetDbConfirm = false;
  }

  protected openResetDbConfirm(): void {
    this.showResetDbConfirm = true;
  }

  protected submitResetDb(): void {
    this.loading = true;
    this.dashboardService.resetDatabase().subscribe({
      next: () => {
        this.closeAllModals();
        this.actionMessage = 'База даних скинута';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.loading = false;
        this.errorMessage = this.extractMessage(error, 'Failed to reset database');
        this.cdr.detectChanges();
      }
    });
  }

  protected submitAddItem(): void {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.actionMessage = '';
    this.dashboardService.addComponent(this.addForm.getRawValue()).pipe(finalize(() => this.loading = false)).subscribe({
        next: () => {
        this.closeAllModals();
        this.actionMessage = 'Компонент додано';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to add component');
        this.cdr.detectChanges();
      }
    });
  }

  protected submitEditItem(): void {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.dashboardService.updateComponent(this.editForm.getRawValue()).subscribe({
        next: () => {
        this.closeAllModals();
        this.actionMessage = 'Компонент оновлено';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to update component');
        this.cdr.detectChanges();
      }
    });
  }

  protected submitAssign(): void {
    if (this.assignForm.invalid) {
      this.assignForm.markAllAsTouched();
      return;
    }

    const { itemId, userId } = this.assignForm.getRawValue();
    this.dashboardService.assignComponent(Number(itemId), Number(userId)).subscribe({
        next: () => {
        this.closeAllModals();
        this.actionMessage = 'Компонент призначено';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to assign component');
        this.cdr.detectChanges();
      }
    });
  }

  protected submitAddUser(): void {
    if (this.addUserForm.invalid) {
      this.addUserForm.markAllAsTouched();
      return;
    }

    this.dashboardService.addUser(this.addUserForm.getRawValue()).subscribe({
        next: () => {
        this.closeAllModals();
        this.actionMessage = 'Користувача створено';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to create user');
        this.cdr.detectChanges();
      }
    });
  }

  protected submitDeleteUser(): void {
    if (this.deleteUserForm.invalid) {
      this.deleteUserForm.markAllAsTouched();
      return;
    }

    const { userId } = this.deleteUserForm.getRawValue();
    this.dashboardService.deleteUser(Number(userId)).subscribe({
        next: () => {
        this.closeAllModals();
        this.actionMessage = 'Користувача видалено';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to delete user');
        this.cdr.detectChanges();
      }
    });
  }

  protected removeComponent(id: number): void {
    this.dashboardService.removeComponent(id).subscribe({
      next: () => {
        this.actionMessage = 'Компонент видалено';
        this.loadDashboard();
      },
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to delete component');
        this.cdr.detectChanges();
      }
    });
  }

  protected fixComponent(id: number): void {
    this.dashboardService.fixComponent(Number(id)).subscribe({
      next: () => this.loadDashboard(),
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to mark component as fixed');
        this.cdr.detectChanges();
      }
    });
  }

  protected unassignComponent(id: number): void {
    this.dashboardService.unassignComponent(Number(id)).subscribe({
      next: () => this.loadDashboard(),
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to unassign component');
        this.cdr.detectChanges();
      }
    });
  }

  protected returnComponent(id: number): void {
    this.dashboardService.returnComponent(Number(id)).subscribe({
      next: () => this.loadDashboard(),
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to return component');
        this.cdr.detectChanges();
      }
    });
  }

  protected returnBrokenComponent(id: number): void {
    this.dashboardService.returnBrokenComponent(Number(id)).subscribe({
      next: () => this.loadDashboard(),
      error: (error: unknown) => {
        this.errorMessage = this.extractMessage(error, 'Failed to return component as broken');
        this.cdr.detectChanges();
      }
    });
  }

  protected getTitle(): string {
    if (!this.dashboard?.user) {
      return 'Список обладнання';
    }

    return this.dashboard.user.role === 'admin' || this.dashboard.user.role === 'teacher'
      ? 'Список обладнання'
      : 'Моє обладнання';
  }

  protected isAdmin(): boolean {
    return this.dashboard?.user?.role === 'admin';
  }

  protected getItems(): DashboardItem[] {
    return this.filteredItems;
  }

  protected getAvailableTypes(): string[] {
    const types = new Set((this.dashboard?.items ?? []).map(item => item.type));
    return Array.from(types).sort();
  }

  protected getAvailableStatuses(): string[] {
    return ['вільне', 'призначене', 'ремонт'];
  }

  protected clearFilters(): void {
    this.filterForm.reset({
      searchQuery: '',
      statusFilter: '',
      typeFilter: ''
    });
  }

  protected toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  protected getUsers(): DashboardUser[] {
    return this.dashboard?.users ?? [];
  }

  protected getAssignableUsers(): DashboardUser[] {
    return this.getUsers().filter((user) => user.role !== 'admin');
  }

  protected getAssignmentLabel(itemId: number): string {
    const assignment = this.dashboard?.assignmentByEquipmentId?.[String(itemId)];
    return assignment || 'Не призначено';
  }

  protected isAssigned(itemId: number): boolean {
    return (this.dashboard?.assignedEquipmentIds ?? []).includes(itemId);
  }

  protected getReport(): WarehouseReport | null {
    return this.dashboard?.warehouseReport ?? null;
  }

  protected trackById(_: number, item: DashboardItem | DashboardUser): number {
    return item.id;
  }

  private extractMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'object' && error && 'error' in error) {
      const responseError = (error as { error?: { message?: string } }).error;
      if (responseError?.message) {
        return responseError.message;
      }
    }

    return fallback;
  }

  private runServerSearch(): void {
    if (!this.dashboard) {
      return;
    }

    const query = String(this.filterForm.get('searchQuery')?.value ?? '');
    const status = String(this.filterForm.get('statusFilter')?.value ?? '');
    const type = String(this.filterForm.get('typeFilter')?.value ?? '');
    const normalizedQuery = query.trim().toLowerCase();

    this.filteredItems = (this.dashboard.items ?? []).filter((item) => {
      const matchesQuery = !normalizedQuery || [item.name, item.type, item.serial, item.status, item.description, String(item.id)]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      const matchesStatus = !status || item.status === status;
      const matchesType = !type || item.type === type;

      return matchesQuery && matchesStatus && matchesType;
    });

    this.cdr.detectChanges();
  }
}

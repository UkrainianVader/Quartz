import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected errorMessage = '';
  protected isSubmitting = false;

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  protected submit(): void {
    this.errorMessage = '';
    this.cdr.detectChanges();

    if (this.form.invalid || this.isSubmitting) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    this.cdr.detectChanges();

    const { username, password } = this.form.getRawValue();

    this.authService.login(username, password)
      .pipe(finalize(() => {
        this.isSubmitting = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          void this.router.navigateByUrl('/inventory');
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse) {
            const message = error.error?.message;
            this.errorMessage = typeof message === 'string' && message
              ? message
              : 'Невірний логін або пароль';
            this.cdr.detectChanges();
            return;
          }

          if (error instanceof Error && error.message) {
            this.errorMessage = error.message;
            this.cdr.detectChanges();
            return;
          }

          this.errorMessage = 'Невірний логін або пароль';
          this.cdr.detectChanges();
        }
      });
  }
}

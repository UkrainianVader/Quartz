import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize } from 'rxjs';
import { AuthService } from '../auth.service';
import { MobileCompanionService } from '../mobile-companion.service';
import { ServerInfo, ServerInfoService } from '../server-info.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly serverInfoService = inject(ServerInfoService);
  private readonly mobileCompanionService = inject(MobileCompanionService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);

  protected errorMessage = '';
  protected isSubmitting = false;
  protected serverInfo: ServerInfo | null = null;
  protected serverInfoLoading = true;
  protected serverInfoError = false;
  protected mobileCompanionLoading = true;
  protected mobileCompanionError = false;
  protected mobileCompanionAvailable = false;
  protected mobileCompanionFileName = '';
  protected mobileCompanionUrl = '';
  protected mobileCompanionQrUrl = '';

  protected readonly form = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  ngOnInit(): void {
    this.serverInfoService.getServerInfo().subscribe({
      next: (serverInfo) => {
        this.serverInfo = serverInfo;
        this.serverInfoLoading = false;
        this.serverInfoError = false;
        this.loadMobileCompanionInfo(serverInfo);
        this.cdr.detectChanges();
      },
      error: () => {
        this.serverInfoLoading = false;
        this.serverInfoError = true;
        this.mobileCompanionLoading = false;
        this.mobileCompanionError = true;
        this.cdr.detectChanges();
      }
    });
  }

  private loadMobileCompanionInfo(serverInfo: ServerInfo): void {
    this.mobileCompanionService.getInfo().subscribe({
      next: (info) => {
        this.mobileCompanionLoading = false;
        this.mobileCompanionError = false;
        this.mobileCompanionAvailable = Boolean(info.available && info.downloadPath);
        this.mobileCompanionFileName = info.fileName || 'Quartz Go.apk';

        if (this.mobileCompanionAvailable && info.downloadPath) {
          this.mobileCompanionUrl = this.buildAbsoluteUrl(serverInfo.primaryUrl, info.downloadPath);
          this.mobileCompanionQrUrl = this.buildQrCodeImageUrl(this.mobileCompanionUrl);
        } else {
          this.mobileCompanionUrl = '';
          this.mobileCompanionQrUrl = '';
        }

        this.cdr.detectChanges();
      },
      error: () => {
        this.mobileCompanionLoading = false;
        this.mobileCompanionError = true;
        this.mobileCompanionAvailable = false;
        this.mobileCompanionUrl = '';
        this.mobileCompanionQrUrl = '';
        this.cdr.detectChanges();
      }
    });
  }

  private buildAbsoluteUrl(baseUrl: string, relativePath: string): string {
    const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
    const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

    return `${normalizedBaseUrl}${normalizedPath}`;
  }

  private buildQrCodeImageUrl(targetUrl: string): string {
    const encodedUrl = encodeURIComponent(targetUrl);
    return `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=0&data=${encodedUrl}`;
  }

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

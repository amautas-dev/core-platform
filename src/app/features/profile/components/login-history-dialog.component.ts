import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { ProfileService, SessionDto } from '../services/profile.service';

@Component({
  selector: 'app-login-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatTableModule,
    MatProgressSpinnerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './login-history-dialog.component.html',
  styleUrls: ['./login-history-dialog.component.scss'],
})
export class LoginHistoryDialogComponent implements OnInit {
  private readonly ref = inject(MatDialogRef<LoginHistoryDialogComponent>);
  private readonly profileService = inject(ProfileService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly dataSource = new MatTableDataSource<SessionDto>([]);
  readonly displayedColumns = ['createdAt', 'ipAddress', 'deviceInfo', 'status'];

  ngOnInit(): void {
    this.profileService.getLoginHistory().subscribe({
      next: (res) => {
        this.dataSource.data = res.sessions ?? [];
        this.loading.set(false);
      },
      error: () => {
        this.error.set('profile.loginHistoryError');
        this.loading.set(false);
      },
    });
  }

  close(): void {
    this.ref.close();
  }

  formatDate(iso: string | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }

  isActive(session: SessionDto): boolean {
    return !session.revokedAt && new Date(session.expiresAt) > new Date();
  }
}

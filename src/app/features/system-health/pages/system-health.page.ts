import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SystemHealthService, type SystemHealthResponse } from '../services/system-health.service';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-system-health-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './system-health.page.html',
  styleUrls: ['./system-health.page.scss'],
})
export class SystemHealthPage implements OnInit {
  private readonly systemHealthService = inject(SystemHealthService);

  readonly health = signal<SystemHealthResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  ngOnInit(): void {
    this.systemHealthService.getSystemHealth().subscribe({
      next: (data) => {
        this.health.set(data);
        this.error.set(false);
        this.loading.set(false);
      },
      error: () => {
        this.health.set(null);
        this.error.set(true);
        this.loading.set(false);
      },
    });
  }

  isOk(value: string): boolean {
    return value === 'ok';
  }

  formatUptime(seconds: number): string {
    if (seconds < 60) return `${seconds} s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} h`;
    return `${(seconds / 86400).toFixed(1)} days`;
  }
}

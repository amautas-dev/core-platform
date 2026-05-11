import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { DashboardService, type PlatformMetrics } from '../services/dashboard.service';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTableModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);

  readonly metrics = signal<PlatformMetrics | null>(null);
  readonly metricsLoading = signal(true);
  readonly metricsError = signal(false);

  ngOnInit(): void {
    this.dashboardService.getPlatformMetrics().subscribe({
      next: (data) => {
        this.metrics.set(data);
        this.metricsError.set(false);
        this.metricsLoading.set(false);
      },
      error: () => {
        this.metrics.set(null);
        this.metricsError.set(true);
        this.metricsLoading.set(false);
      },
    });
  }
}

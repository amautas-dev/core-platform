import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { ProfileService } from '../services/profile.service';
import { SessionService } from '../../../core/session/session.service';
import { LanguageService } from '../../../core/i18n/language.service';
import { PlatformSettingsService } from '../../platform-settings/services/platform-settings.service';
import { ChangePasswordDialogComponent } from '../components/change-password-dialog.component';
import { LoginHistoryDialogComponent } from '../components/login-history-dialog.component';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage implements OnInit {
  private readonly profileService = inject(ProfileService);
  private readonly session = inject(SessionService);
  private readonly languageService = inject(LanguageService);
  private readonly settingsService = inject(PlatformSettingsService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly profile = signal<{ name: string; email: string; role: string; lastLoginAt?: string } | null>(null);
  readonly timezone = signal<string>('');
  readonly avatarUrl = computed(() => 'assets/images/default-user.jpg');

  readonly name = computed(() => this.profile()?.name ?? this.session.user()?.name ?? '');
  readonly email = computed(() => this.profile()?.email ?? this.session.user()?.email ?? '');
  readonly language = computed(() => this.languageService.currentLangLabel);
  readonly role = computed(() => this.profile()?.role ?? '');

  ngOnInit(): void {
    this.loadProfile();
    this.settingsService.getSettings().subscribe({
      next: (s) => this.timezone.set(s.timezone ?? ''),
      error: () => this.timezone.set(''),
    });
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profileService.getMe().subscribe({
      next: (res) => {
        const u = res?.user;
        if (!u) {
          this.profile.set({
            name: this.session.user()?.name ?? '',
            email: this.session.user()?.email ?? '',
            role: '',
          });
          this.error.set('profile.loadError');
          this.loading.set(false);
          return;
        }
        this.profile.set({
          name: u.name ?? u.username ?? u.email ?? '',
          email: u.email ?? '',
          role: u.role ?? '',
          lastLoginAt: u.lastLoginAt,
        });
        this.loading.set(false);
      },
      error: (err) => {
        this.profile.set({
          name: this.session.user()?.name ?? '',
          email: this.session.user()?.email ?? '',
          role: '',
        });
        const msg = err?.error?.error ?? err?.message;
        this.error.set(typeof msg === 'string' ? msg : 'profile.loadError');
        this.loading.set(false);
      },
    });
  }

  openChangePassword(): void {
    this.dialog.open(ChangePasswordDialogComponent, { width: '400px' });
  }

  openLoginHistory(): void {
    this.dialog.open(LoginHistoryDialogComponent, { width: '560px' });
  }
}

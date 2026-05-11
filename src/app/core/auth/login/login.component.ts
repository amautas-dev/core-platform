import { HttpClient } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PlatformTranslatePipe } from '../../i18n/translate.pipe';
import { AuthService } from '../auth.service';
import { ApiService } from '../../api/api.service';
import {
  type PlatformLoginBrandingDto,
  resolveLoginHeroPath,
  resolveLoginLogoPath,
  resolveLoginPageBackground,
  resolveLoginPrimaryTint,
  resolvePlatformFaviconUrl,
  setRootCssUrlVar,
} from './login-platform-branding';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly api = inject(ApiService);

  private lastBranding: PlatformLoginBrandingDto | null = null;
  private colorSchemeMql: MediaQueryList | null = null;
  private colorSchemeListener: (() => void) | null = null;

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly hidePassword = signal(true);

  form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  ngOnInit(): void {
    this.applyNeutralLoginShell();
    const url = this.api.buildUrl('v1/public/platform-login-branding');
    this.http.get<PlatformLoginBrandingDto>(url).subscribe({
      next: (dto) => {
        this.lastBranding = dto;
        this.applyLoginBrandingVars(dto);
        this.colorSchemeMql = window.matchMedia('(prefers-color-scheme: dark)');
        this.colorSchemeListener = () => {
          if (this.lastBranding) this.applyLoginBrandingVars(this.lastBranding);
        };
        this.colorSchemeMql.addEventListener('change', this.colorSchemeListener);
      },
      error: () => {
        this.applyNeutralLoginShell();
      },
    });
  }

  /** Sin JWT / error API: nada de portada ni logo embebidos del bundle. */
  private applyNeutralLoginShell(): void {
    document.documentElement.style.setProperty('--theme-login-hero-url', 'none');
    document.documentElement.style.setProperty('--theme-logo-url', 'none');
    document.documentElement.style.setProperty('--login-page-bg', resolveLoginPageBackground(null));
    document.documentElement.style.setProperty('--login-primary-tint', resolveLoginPrimaryTint(null));
  }

  ngOnDestroy(): void {
    if (this.colorSchemeMql && this.colorSchemeListener) {
      this.colorSchemeMql.removeEventListener('change', this.colorSchemeListener);
    }
    this.colorSchemeMql = null;
    this.colorSchemeListener = null;
  }

  private applyLoginBrandingVars(dto: PlatformLoginBrandingDto): void {
    const build = (path: string) => this.api.buildUrl(path);
    document.documentElement.style.setProperty('--login-page-bg', resolveLoginPageBackground(dto));
    document.documentElement.style.setProperty('--login-primary-tint', resolveLoginPrimaryTint(dto));
    const hero = resolveLoginHeroPath(dto, build);
    if (hero) {
      setRootCssUrlVar('--theme-login-hero-url', hero);
    } else {
      document.documentElement.style.setProperty('--theme-login-hero-url', 'none');
    }
    const logo = resolveLoginLogoPath(dto, build);
    if (logo) {
      setRootCssUrlVar('--theme-logo-url', logo);
    } else {
      document.documentElement.style.setProperty('--theme-logo-url', 'none');
    }
    const fav = resolvePlatformFaviconUrl(dto, build);
    if (fav) {
      const bust = fav.includes('?') ? fav : `${fav}?t=${Date.now()}`;
      for (const rel of ['icon', 'shortcut icon'] as const) {
        let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
        if (!el) {
          el = document.createElement('link');
          el.rel = rel;
          document.head.appendChild(el);
        }
        el.href = bust;
      }
    }
  }

  async submit(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.loading.set(true);
    this.error.set(null);

    const { username, password } = this.form.getRawValue();

    try {
      await this.auth.login(String(username ?? ''), String(password ?? ''));
    } catch (e) {
      this.error.set('authLogin.errorGeneric');
    } finally {
      this.loading.set(false);
    }
  }
}

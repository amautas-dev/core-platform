import { Component, inject, signal, OnInit, computed, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import {
  PlatformSettingsService,
  type PlatformSettingsDto,
  type PlatformLanguageDto,
} from '../services/platform-settings.service';
import { THEME_PALETTES, type ThemePalette } from '../../../shared/theming/theme-palettes';
import { buildAdvisorGeneratedPalette } from '../../../shared/theming/palette-assistant';
import { FONT_PRESETS } from '../../../shared/theming/font-presets';
import type { BrandingColors } from '../services/platform-settings.service';
import type { BrandingColorInput } from '../../../core/theming/branding.types';
import { TenantThemeService } from '../../../core/theming/tenant-theme.service';
import { COLOR_SCALE_STOPS } from '../../../core/theming/theme-tokens';
import type { ThemeTokens } from '../../../core/theming/theme-tokens';
import {
  mergeThemeTokens,
  pruneRedundantOverrides,
  parsePartialThemeTokensFromApi,
  type PartialThemeTokens,
} from '../../../core/theming/theme-token-merge';
import { ThemePaletteFineTuningComponent } from '../../../shared/components/theme-palette-fine-tuning/theme-palette-fine-tuning.component';
import { resolveSemanticTheme } from '../../../core/theming/theme-semantic-generator';
import { legacyColumnsFromTokens, resolveAccentColorFromDto } from '../../../core/theming/branding-legacy';
import { validateBrandingColors, type BrandingColorWarnings } from '../../../core/theming/branding-validation';
import { BrandingAssetUploadComponent } from '../../../shared/components/branding-asset-upload/branding-asset-upload.component';

const HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;
const PALETTE_EDIT_MODE_KEY = 'platformAdmin.paletteEditMode.v1';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatTabsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatButtonToggleModule,
    PlatformTranslatePipe,
    ThemePaletteFineTuningComponent,
    BrandingAssetUploadComponent,
  ],
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(PlatformSettingsService);
  private readonly tenantTheme = inject(TenantThemeService);
  private readonly destroyRef = inject(DestroyRef);

  /** Stops 50–900 para mostrar la escala en la vista previa */
  readonly colorScaleStops = COLOR_SCALE_STOPS;

  /** Paleta generada solo desde colores de marca (sin overrides). */
  readonly generatedThemeTokens = signal<ThemeTokens | null>(null);
  /** Overrides persistibles (parciales). */
  readonly themeTokenOverrides = signal<PartialThemeTokens | null>(null);
  /** `auto`: la UI no aplica overrides al documento; `manual`: merge(generated, overrides). */
  readonly themeEditMode = signal<'auto' | 'manual'>('auto');

  readonly resolvedThemeTokens = computed(() => {
    const gen = this.generatedThemeTokens();
    if (!gen) return null;
    const o = this.themeEditMode() === 'manual' ? this.themeTokenOverrides() : null;
    return mergeThemeTokens(gen, o);
  });

  /** Roles semánticos de interfaz (fondo, sidebar, header, CTAs) derivados de la paleta resuelta. */
  readonly semanticTheme = computed(() => {
    const r = this.resolvedThemeTokens();
    return r ? resolveSemanticTheme(r) : null;
  });

  readonly manualOverrideCount = computed(() => {
    const gen = this.generatedThemeTokens();
    const o = this.themeTokenOverrides();
    if (!gen || !o) return 0;
    let n = 0;
    for (const scale of ['primary', 'accent', 'neutral'] as const) {
      const part = o[scale];
      if (!part) continue;
      for (const stop of COLOR_SCALE_STOPS) {
        const v = part[stop];
        if (v != null && String(v).trim() && String(v).trim().toLowerCase() !== gen[scale][stop].toLowerCase()) {
          n++;
        }
      }
    }
    if (o.functional) {
      for (const k of ['success', 'warning', 'error', 'info'] as const) {
        const v = o.functional[k];
        if (v != null && String(v).trim() && String(v).trim().toLowerCase() !== gen.functional[k].toLowerCase()) {
          n++;
        }
      }
    }
    return n;
  });

  readonly saving = signal(false);
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly languages = signal<PlatformLanguageDto[]>([]);
  private readonly assetCacheBuster = signal(0);
  /** Vista previa identidad: modo claro u oscuro del mock. */
  readonly brandPreviewMode = signal<'light' | 'dark'>('light');
  private lastBrandingDto = signal<PlatformSettingsDto | null>(null);
  readonly themePalettes = THEME_PALETTES;
  readonly selectedPaletteId = signal<string | null>(null);
  readonly advisorColor1 = signal('#0FA2CC');
  readonly advisorColor2 = signal('');
  readonly advisorColor3 = signal('');
  readonly paletteRecommendations = signal<ThemePalette[]>([]);
  readonly fontPresets = FONT_PRESETS;
  /** `custom` = no coincide con un preset */
  readonly selectedFontPresetId = signal<string>('custom');
  /** Asistente de paleta + grid de presets: oculto por defecto */
  readonly showPaletteTools = signal(false);

  readonly brandingColorWarnings = computed<BrandingColorWarnings>(() => {
    const raw = this.brandingForm.getRawValue();
    return validateBrandingColors(raw.primaryColor ?? '', raw.accentColor ?? null);
  });

  readonly brandingForm = this.fb.nonNullable.group({
    logoFileId: [null as string | null],
    logoDarkFileId: [null as string | null],
    logoCompactFileId: [null as string | null],
    logoCompactDarkFileId: [null as string | null],
    faviconFileId: [null as string | null],
    loginBackgroundLightFileId: [null as string | null],
    loginBackgroundDarkFileId: [null as string | null],
    appBackgroundPatternFileId: [null as string | null],
    loginBackgroundUrl: [''],
    themeModeDefault: ['system' as 'light' | 'dark' | 'system'],
    primaryColor: ['#1f6feb', Validators.pattern(HEX_PATTERN)],
    accentColor: ['#4dd2f0', Validators.pattern(HEX_PATTERN)],
    buttonCancelColor: ['#5f6b7a', Validators.pattern(HEX_PATTERN)],
    fontFamily: [''],
  });

  readonly localizationForm = this.fb.nonNullable.group({
    defaultLanguageCode: ['es'],
    availableLanguageCodes: [['es', 'en'] as string[]],
  });

  readonly systemForm = this.fb.nonNullable.group({
    dateFormat: ['dd/MM/yyyy'],
    currency: ['USD'],
    timezone: ['America/Argentina/Buenos_Aires'],
  });

  readonly dateFormatOptions = [
    { value: 'dd/MM/yyyy', labelKey: 'settings.system.dateFormatDmy' },
    { value: 'MM/dd/yyyy', labelKey: 'settings.system.dateFormatMdy' },
    { value: 'yyyy-MM-dd', labelKey: 'settings.system.dateFormatYmd' },
  ];

  readonly currencyOptions = [
    { value: 'USD', labelKey: 'settings.system.currencyUsd' },
    { value: 'EUR', labelKey: 'settings.system.currencyEur' },
    { value: 'PEN', labelKey: 'settings.system.currencyPen' },
    { value: 'ARS', labelKey: 'settings.system.currencyArs' },
  ];

  readonly timezoneOptions = [
    { value: 'America/Argentina/Buenos_Aires', labelKey: 'settings.system.timezoneBuenosAires' },
    { value: 'America/Lima', labelKey: 'settings.system.timezoneLima' },
    { value: 'America/New_York', labelKey: 'settings.system.timezoneNewYork' },
    { value: 'Europe/Madrid', labelKey: 'settings.system.timezoneMadrid' },
    { value: 'UTC', labelKey: 'settings.system.timezoneUtc' },
  ];

  ngOnInit(): void {
    this.loadSettings();
    this.loadLanguages();
    this.recomputeRecommendations();
    this.brandingForm.controls.fontFamily.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.syncFontPresetFromForm());
    this.brandingForm.valueChanges
      .pipe(debounceTime(200), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.refreshThemeState();
        this.applyLiveBranding();
      });
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.settingsService.getSettings().subscribe({
      next: (dto) => {
        this.lastBrandingDto.set(dto);
        this.patchFormsFromDto(dto);
        this.refreshThemeState();
        this.settingsService.applyBrandingToDocument(this.getBrandingApplyPayload());
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(err?.message ?? 'Error al cargar configuración');
        this.loading.set(false);
      },
    });
  }

  private loadLanguages(): void {
    this.settingsService.getLanguages().subscribe({
      next: (list) => this.languages.set(list),
      error: () => this.languages.set([]),
    });
  }

  private patchFormsFromDto(dto: PlatformSettingsDto): void {
    const parsedOverrides = parsePartialThemeTokensFromApi(dto.themeTokenOverrides as unknown);
    this.themeTokenOverrides.set(parsedOverrides);

    const hasSavedOverrides =
      parsedOverrides &&
      ((parsedOverrides.primary && Object.keys(parsedOverrides.primary).length > 0) ||
        (parsedOverrides.accent && Object.keys(parsedOverrides.accent).length > 0) ||
        (parsedOverrides.neutral && Object.keys(parsedOverrides.neutral).length > 0) ||
        (parsedOverrides.functional && Object.keys(parsedOverrides.functional).length > 0));

    if (hasSavedOverrides) {
      this.themeEditMode.set('manual');
    } else {
      let stored: 'auto' | 'manual' = 'auto';
      try {
        const v = localStorage.getItem(PALETTE_EDIT_MODE_KEY);
        if (v === 'manual' || v === 'auto') stored = v;
      } catch {
        /* ignore */
      }
      this.themeEditMode.set(stored);
    }

    const legacyDto = dto as Partial<BrandingColorInput>;
    const accentFromApi =
      (typeof legacyDto.accentColor === 'string' && legacyDto.accentColor.trim()) ||
      resolveAccentColorFromDto(legacyDto) ||
      undefined;

    const tm = dto.themeModeDefault;
    const themeModeDefault: 'light' | 'dark' | 'system' =
      tm === 'light' || tm === 'dark' || tm === 'system' ? tm : 'system';

    this.brandingForm.patchValue({
      logoFileId: dto.logoFileId ?? null,
      logoDarkFileId: dto.logoDarkFileId ?? null,
      logoCompactFileId: dto.logoCompactFileId ?? null,
      logoCompactDarkFileId: dto.logoCompactDarkFileId ?? null,
      faviconFileId: dto.faviconFileId ?? null,
      loginBackgroundLightFileId: dto.loginBackgroundLightFileId ?? null,
      loginBackgroundDarkFileId: dto.loginBackgroundDarkFileId ?? null,
      appBackgroundPatternFileId: dto.appBackgroundPatternFileId ?? null,
      loginBackgroundUrl: dto.loginBackgroundUrl ?? '',
      themeModeDefault,
      primaryColor: dto.primaryColor ?? '#1f6feb',
      accentColor: accentFromApi ?? '#4dd2f0',
      buttonCancelColor: dto.buttonCancelColor ?? '#5f6b7a',
      fontFamily: dto.fontFamily ?? '',
    });
    this.localizationForm.patchValue({
      defaultLanguageCode: dto.defaultLanguageCode ?? 'es',
      availableLanguageCodes: Array.isArray(dto.availableLanguageCodes)
        ? dto.availableLanguageCodes
        : ['es', 'en'],
    });
    this.systemForm.patchValue({
      dateFormat: dto.dateFormat ?? 'dd/MM/yyyy',
      currency: dto.currency ?? 'USD',
      timezone: dto.timezone ?? 'America/Argentina/Buenos_Aires',
    });
    this.syncFontPresetFromForm();
    this.refreshThemeState();
  }

  /**
   * Regenera la paleta base y recorta overrides que ya coinciden con el generado
   * (p. ej. tras cambiar Color 1/2/3 o campos de marca).
   */
  private refreshThemeState(): void {
    const raw = this.brandingForm.getRawValue();
    if (!raw.primaryColor || !HEX_PATTERN.test(raw.primaryColor)) {
      this.generatedThemeTokens.set(null);
      return;
    }
    try {
      const gen = this.tenantTheme.tokensFromBranding({
        primaryColor: raw.primaryColor,
        accentColor: raw.accentColor,
      });
      this.generatedThemeTokens.set(gen);
      this.themeTokenOverrides.update((prev) => pruneRedundantOverrides(gen, prev));
    } catch {
      this.generatedThemeTokens.set(null);
    }
  }

  private getBrandingApplyPayload(): Partial<BrandingColors> & Partial<PlatformSettingsDto> {
    const raw = this.brandingForm.getRawValue() as BrandingColors & Partial<PlatformSettingsDto>;
    return {
      ...raw,
      themeModeDefault: raw.themeModeDefault,
      themeTokenOverrides: this.themeEditMode() === 'manual' ? this.themeTokenOverrides() : null,
    };
  }

  private applyLiveBranding(): void {
    this.settingsService.applyBrandingToDocument(this.getBrandingApplyPayload());
  }

  setThemeEditMode(mode: 'auto' | 'manual'): void {
    this.themeEditMode.set(mode);
    try {
      localStorage.setItem(PALETTE_EDIT_MODE_KEY, mode);
    } catch {
      /* ignore */
    }
    this.applyLiveBranding();
  }

  onPaletteOverridesChange(ev: PartialThemeTokens | null): void {
    this.themeTokenOverrides.set(ev);
    this.applyLiveBranding();
  }

  onPaletteResetScale(scale: 'primary' | 'accent' | 'neutral' | 'functional'): void {
    const o = this.themeTokenOverrides();
    if (!o) return;
    const next: PartialThemeTokens = { ...o };
    if (scale === 'functional') {
      delete next.functional;
    } else {
      delete next[scale];
    }
    const has =
      (next.primary && Object.keys(next.primary).length > 0) ||
      (next.accent && Object.keys(next.accent).length > 0) ||
      (next.neutral && Object.keys(next.neutral).length > 0) ||
      (next.functional && Object.keys(next.functional).length > 0);
    this.themeTokenOverrides.set(has ? next : null);
    this.applyLiveBranding();
  }

  onPaletteResetAll(): void {
    this.themeTokenOverrides.set(null);
    this.applyLiveBranding();
  }

  private normalizeFontStack(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .replace(/['"]/g, '')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s+/g, '');
  }

  private syncFontPresetFromForm(): void {
    const raw = this.brandingForm.get('fontFamily')?.value ?? '';
    if (!raw.trim()) {
      this.selectedFontPresetId.set('custom');
      return;
    }
    const n = this.normalizeFontStack(raw);
    const match = FONT_PRESETS.find((p) => this.normalizeFontStack(p.fontFamily) === n);
    this.selectedFontPresetId.set(match?.id ?? 'custom');
  }

  togglePaletteTools(): void {
    this.showPaletteTools.update((v) => !v);
  }

  onFontPresetChange(value: string): void {
    if (value === 'custom') {
      this.selectedFontPresetId.set('custom');
      return;
    }
    const preset = FONT_PRESETS.find((p) => p.id === value);
    if (!preset) return;
    this.brandingForm.patchValue({ fontFamily: preset.fontFamily }, { emitEvent: false });
    this.selectedFontPresetId.set(value);
    this.applyLiveBranding();
  }

  isLanguageAvailable(code: string): boolean {
    return this.localizationForm.controls.availableLanguageCodes.value?.includes(code) ?? false;
  }

  toggleLanguage(code: string): void {
    const current = this.localizationForm.controls.availableLanguageCodes.value ?? [];
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    this.localizationForm.controls.availableLanguageCodes.setValue(next);
  }

  /** Subida plataforma: devuelve handler para `app-branding-asset-upload`. */
  platformAssetUpload(
    type:
      | 'logo'
      | 'logo_dark'
      | 'logo_compact'
      | 'logo_compact_dark'
      | 'favicon'
      | 'login_background_light'
      | 'login_background_dark'
      | 'app_background_pattern',
  ): (file: File) => import('rxjs').Observable<{ id: string }> {
    return (file: File) =>
      this.settingsService.uploadAsset(file, type).pipe(
        map((res) => {
          this.assetCacheBuster.update((n) => n + 1);
          return { id: res.id };
        }),
      );
  }

  onPlatformAssetFileId(
    field:
      | 'logoFileId'
      | 'logoDarkFileId'
      | 'logoCompactFileId'
      | 'logoCompactDarkFileId'
      | 'faviconFileId'
      | 'loginBackgroundLightFileId'
      | 'loginBackgroundDarkFileId'
      | 'appBackgroundPatternFileId',
    ev: { id: string },
  ): void {
    this.brandingForm.patchValue({ [field]: ev.id } as Record<string, string>);
    this.persistPlatformAssetField(field, ev.id);
  }

  clearPlatformAsset(
    field:
      | 'logoFileId'
      | 'logoDarkFileId'
      | 'logoCompactFileId'
      | 'logoCompactDarkFileId'
      | 'faviconFileId'
      | 'loginBackgroundLightFileId'
      | 'loginBackgroundDarkFileId'
      | 'appBackgroundPatternFileId',
  ): void {
    this.brandingForm.patchValue({ [field]: null } as Record<string, null>);
    this.assetCacheBuster.update((n) => n + 1);
    this.persistPlatformAssetField(field, null);
  }

  /** Persiste solo el fileId en API (las <img> usan URL pública; el id debe quedar en platform_setting). */
  private persistPlatformAssetField(
    field:
      | 'logoFileId'
      | 'logoDarkFileId'
      | 'logoCompactFileId'
      | 'logoCompactDarkFileId'
      | 'faviconFileId'
      | 'loginBackgroundLightFileId'
      | 'loginBackgroundDarkFileId'
      | 'appBackgroundPatternFileId',
    value: string | null,
  ): void {
    this.saving.set(true);
    const body = { [field]: value } as Partial<PlatformSettingsDto>;
    this.settingsService.updateSettings(body).subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.lastBrandingDto.set(saved);
        this.assetCacheBuster.update((n) => n + 1);
        this.settingsService.applyBrandingToDocument(this.getBrandingApplyPayload());
      },
      error: () => this.saving.set(false),
    });
  }

  previewUrlForFileId(fileId: string | null | undefined): string | null {
    const u = this.settingsService.platformAssetUrlByFileId(fileId ?? null);
    if (!u) return null;
    return `${u}?t=${this.assetCacheBuster()}`;
  }

  loginPreviewBackground(): string {
    const v = this.brandingForm.getRawValue();
    const id =
      this.brandPreviewMode() === 'dark' ? v.loginBackgroundDarkFileId : v.loginBackgroundLightFileId;
    const u = this.previewUrlForFileId(id);
    if (u) return `url("${u.replace(/"/g, '\\"')}")`;
    return 'linear-gradient(155deg, var(--color-primary-600, #0c8cb0), var(--color-primary-900, #063544))';
  }

  loginPatternOverlay(): string | null {
    const v = this.brandingForm.getRawValue();
    const u = this.previewUrlForFileId(v.appBackgroundPatternFileId);
    if (!u) return null;
    return `url("${u.replace(/"/g, '\\"')}")`;
  }

  private absoluteStaticAsset(path: string): string {
    try {
      return new URL(path, document.baseURI).href;
    } catch {
      return path;
    }
  }

  loginMockLogoBg(): string {
    const v = this.brandingForm.getRawValue();
    const id = this.brandPreviewMode() === 'dark' ? v.logoDarkFileId : v.logoFileId;
    const u = this.previewUrlForFileId(id);
    if (u) return `url("${u.replace(/"/g, '\\"')}")`;
    return `url("${this.absoluteStaticAsset('assets/brand/amautas-logo.png').replace(/"/g, '\\"')}")`;
  }

  chromeSidebarLogoBg(): string {
    const v = this.brandingForm.getRawValue();
    const dark = this.brandPreviewMode() === 'dark';
    const cid = dark ? v.logoCompactDarkFileId : v.logoCompactFileId;
    const fid = dark ? v.logoDarkFileId : v.logoFileId;
    const u = this.previewUrlForFileId(cid) || this.previewUrlForFileId(fid);
    if (u) return `url("${u.replace(/"/g, '\\"')}")`;
    const fb = dark ? 'assets/brand/amautas-logo-alt-reduc.png' : 'assets/brand/amautas-logo-reduc.png';
    return `url("${this.absoluteStaticAsset(fb).replace(/"/g, '\\"')}")`;
  }

  cancelBranding(): void {
    const d = this.lastBrandingDto();
    if (!d) return;
    this.patchFormsFromDto(d);
    this.refreshThemeState();
    this.settingsService.applyBrandingToDocument(this.getBrandingApplyPayload());
  }

  saveBranding(): void {
    if (this.brandingForm.invalid) return;
    this.saving.set(true);
    const v = this.brandingForm.getRawValue();
    const overrides = this.themeEditMode() === 'manual' ? this.themeTokenOverrides() : null;
    const tokens = this.tenantTheme.resolvedTokensFromBranding(
      {
        primaryColor: v.primaryColor,
        accentColor: v.accentColor,
        buttonCancelColor: v.buttonCancelColor,
      },
      overrides,
    );
    const legacy = legacyColumnsFromTokens(tokens);

    this.settingsService
      .updateSettings({
        logoFileId: v.logoFileId,
        logoDarkFileId: v.logoDarkFileId,
        logoCompactFileId: v.logoCompactFileId,
        logoCompactDarkFileId: v.logoCompactDarkFileId,
        faviconFileId: v.faviconFileId,
        loginBackgroundLightFileId: v.loginBackgroundLightFileId,
        loginBackgroundDarkFileId: v.loginBackgroundDarkFileId,
        appBackgroundPatternFileId: v.appBackgroundPatternFileId,
        loginBackgroundUrl: v.loginBackgroundUrl || null,
        themeModeDefault: v.themeModeDefault,
        primaryColor: v.primaryColor,
        secondaryColor: v.primaryColor,
        sidebarBgColor: legacy.sidebarBgColor,
        headerBgColor: legacy.headerBgColor,
        pageBackgroundColor: legacy.pageBackgroundColor,
        buttonPrimaryColor: legacy.buttonPrimaryColor,
        buttonSecondaryColor: legacy.buttonSecondaryColor,
        buttonCancelColor: v.buttonCancelColor,
        textColor: legacy.textColor,
        fontFamily: v.fontFamily || null,
        themeTokenOverrides: overrides,
      })
      .subscribe({
        next: (saved) => {
          this.saving.set(false);
          this.lastBrandingDto.set(saved);
          this.assetCacheBuster.update((n) => n + 1);
          this.settingsService.applyBrandingToDocument(this.getBrandingApplyPayload());
        },
        error: () => this.saving.set(false),
      });
  }

  applyPalette(palette: ThemePalette): void {
    this.selectedPaletteId.set(palette.id);
    this.brandingForm.patchValue({
      primaryColor: palette.primaryColor,
      accentColor: palette.accentColor,
    });
    this.applyLiveBranding();
  }

  setAdvisorColor(slot: 1 | 2 | 3, value: string): void {
    const v = String(value ?? '').trim();
    if (slot === 1) this.advisorColor1.set(v);
    if (slot === 2) this.advisorColor2.set(v);
    if (slot === 3) this.advisorColor3.set(v);
    this.recomputeRecommendations();
  }

  applyRecommendedPalette(palette: ThemePalette): void {
    this.applyPalette(palette);
  }

  private recomputeRecommendations(): void {
    const c1 = this.normalizeHex(this.advisorColor1());
    const c2 = this.normalizeHex(this.advisorColor2());
    const c3 = this.normalizeHex(this.advisorColor3());
    if (!c1) {
      this.paletteRecommendations.set(this.themePalettes.slice(0, 4));
      return;
    }
    const generated = buildAdvisorGeneratedPalette(c1, c2, c3);
    const ranked = this.themePalettes
      .map((p) => ({ p, score: this.scorePalette(p, c1, c2, c3) }))
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map((x) => x.p);
    this.paletteRecommendations.set([generated, ...ranked]);
  }

  private scorePalette(palette: ThemePalette, c1: string, c2: string | null, c3: string | null): number {
    let score = this.distance(palette.primaryColor, c1) * 2.4;
    const accent = palette.accentColor;
    if (c2) score += this.distance(accent, c2) * 1.7;
    if (c3) score += this.distance(accent, c3) * 1.2;
    return score;
  }

  private normalizeHex(value: string): string | null {
    const v = String(value ?? '').trim();
    if (!v) return null;
    const full = /^#([0-9a-fA-F]{6})$/.test(v) ? v.toUpperCase() : null;
    return full;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const n = hex.replace('#', '');
    return {
      r: parseInt(n.slice(0, 2), 16),
      g: parseInt(n.slice(2, 4), 16),
      b: parseInt(n.slice(4, 6), 16),
    };
  }

  private distance(a: string, b: string): number {
    const ca = this.hexToRgb(a);
    const cb = this.hexToRgb(b);
    const dr = ca.r - cb.r;
    const dg = ca.g - cb.g;
    const db = ca.b - cb.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  saveLocalization(): void {
    if (this.localizationForm.invalid) return;
    this.saving.set(true);
    const v = this.localizationForm.getRawValue();
    this.settingsService
      .updateSettings({
        defaultLanguageCode: v.defaultLanguageCode,
        availableLanguageCodes: v.availableLanguageCodes,
      })
      .subscribe({
        next: () => this.saving.set(false),
        error: () => this.saving.set(false),
      });
  }

  saveSystem(): void {
    if (this.systemForm.invalid) return;
    this.saving.set(true);
    const v = this.systemForm.getRawValue();
    this.settingsService
      .updateSettings({
        dateFormat: v.dateFormat,
        currency: v.currency,
        timezone: v.timezone,
      })
      .subscribe({
        next: () => this.saving.set(false),
        error: () => this.saving.set(false),
      });
  }
}

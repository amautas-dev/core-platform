import type { BrandingColorInput } from './branding.types';

import { resolveAccentColorFromDto } from './branding-legacy';

import {

  darkenHexFactor,

  generateThemeFromBranding,

  mixHex,

  mixWithWhite,

} from './theme-generator';

import { resolveBrandingLayout, type ResolvedBrandingLayout } from './theme-layout-resolver';

import type { ThemeSemantic } from './theme-semantic';

import { resolveSemanticTheme } from './theme-semantic-generator';

import type { PartialThemeTokens } from './theme-token-merge';

import { mergeThemeTokens } from './theme-token-merge';

import type { ColorScale, ThemeTokens } from './theme-tokens';

import { COLOR_SCALE_STOPS } from './theme-tokens';



function applyColorScale(root: CSSStyleDeclaration, scale: ColorScale, name: 'primary' | 'accent' | 'neutral'): void {

  for (const stop of COLOR_SCALE_STOPS) {

    root.setProperty(`--color-${name}-${stop}`, scale[stop]);

  }

}



/** Puente hacia tokens MDC/Material usados en toda la app */

function applyMaterialBridge(

  root: CSSStyleDeclaration,

  identityPrimary: string,

  accentHue: string,

  layout: ResolvedBrandingLayout,

  semantic: ThemeSemantic,

): void {

  const primary = identityPrimary;

  const secondary = accentHue;

  const text = layout.textPrimary;

  const headerBg = semantic.header;

  const as = semantic.actionSecondary;



  root.setProperty('--mat-primary', primary);

  root.setProperty('--mat-primary-color', primary);

  root.setProperty('--mat-sys-primary', primary);

  root.setProperty('--mat-sys-on-primary', '#ffffff');

  root.setProperty('--mat-sys-secondary', secondary);

  root.setProperty('--mat-sys-on-secondary', '#ffffff');

  root.setProperty('--mat-sys-surface', layout.surface);

  root.setProperty('--mat-sys-on-surface', text);

  root.setProperty('--mat-sys-surface-variant', headerBg);

  root.setProperty('--mat-sys-on-surface-variant', text);

  root.setProperty('--mat-sys-background', layout.background);

  root.setProperty('--mat-tab-header-active-label-text-color', primary);

  root.setProperty('--mat-tab-header-active-focus-label-text-color', primary);

  root.setProperty('--mat-tab-header-active-hover-label-text-color', primary);

  root.setProperty('--mat-tab-header-active-focus-indicator-color', primary);

  root.setProperty('--mat-tab-header-active-hover-indicator-color', primary);

  root.setProperty('--mdc-tab-indicator-active-indicator-color', primary);

  root.setProperty('--mat-tab-header-inactive-label-text-color', mixHex(primary, text, 0.55));

  root.setProperty('--mat-tab-header-inactive-hover-label-text-color', mixHex(primary, text, 0.72));

  root.setProperty('--mat-tab-header-inactive-focus-label-text-color', mixHex(primary, text, 0.72));

  root.setProperty('--mat-option-selected-state-layer-color', mixWithWhite(primary, 0.86));

  root.setProperty('--mat-option-hover-state-layer-color', mixWithWhite(primary, 0.9));

  root.setProperty('--mdc-outlined-text-field-focus-outline-color', semantic.focusRing);

  root.setProperty('--mdc-outlined-text-field-focus-label-text-color', primary);

  root.setProperty('--mdc-outlined-text-field-caret-color', primary);

  root.setProperty('--mat-select-focused-arrow-color', primary);

  root.setProperty('--mat-button-protected-container-color', semantic.actionPrimary);

  root.setProperty('--mat-button-protected-label-text-color', '#ffffff');

  root.setProperty('--mat-button-filled-container-color', semantic.actionPrimary);

  root.setProperty('--mat-button-filled-label-text-color', '#ffffff');

  root.setProperty('--mat-button-outlined-outline-color', as.border);

  root.setProperty('--mat-button-outlined-label-text-color', as.text);



  const track = mixWithWhite(primary, 0.45);

  root.setProperty('--mat-slide-toggle-selected-track-color', track);

  root.setProperty('--mat-slide-toggle-selected-handle-color', primary);

  root.setProperty('--mat-slide-toggle-selected-hover-track-color', track);

  root.setProperty('--mat-slide-toggle-selected-hover-handle-color', primary);

  root.setProperty('--mat-slide-toggle-selected-focus-track-color', track);

  root.setProperty('--mat-slide-toggle-selected-focus-handle-color', primary);

  root.setProperty('--mat-slide-toggle-selected-pressed-track-color', track);

  root.setProperty('--mat-slide-toggle-selected-pressed-handle-color', primary);

  root.setProperty('--mat-switch-selected-track-color', track);

  root.setProperty('--mat-switch-selected-handle-color', primary);

  root.setProperty('--mdc-switch-selected-track-color', track);

  root.setProperty('--mdc-switch-selected-handle-color', primary);

  root.setProperty('--mdc-checkbox-selected-icon-color', primary);

  root.setProperty('--mdc-checkbox-selected-hover-icon-color', primary);

  root.setProperty('--mdc-checkbox-selected-focus-icon-color', primary);

  root.setProperty('--mdc-checkbox-selected-pressed-icon-color', primary);

  root.setProperty('--mdc-checkbox-selected-container-color', primary);

  root.setProperty('--mdc-checkbox-selected-hover-state-layer-color', primary);

  root.setProperty('--mdc-checkbox-selected-focus-state-layer-color', primary);

  root.setProperty('--mdc-checkbox-selected-pressed-state-layer-color', primary);

  root.setProperty('--mdc-checkbox-selected-checkmark-color', '#ffffff');

  root.setProperty('--mdc-radio-selected-icon-color', primary);

  root.setProperty('--mdc-radio-selected-hover-icon-color', primary);

  root.setProperty('--mdc-radio-selected-focus-icon-color', primary);

  root.setProperty('--mdc-radio-selected-pressed-icon-color', primary);

}



/**

 * Variables semánticas de UI (`--color-*`). Punto único para layout, texto y acciones.

 */

export function applySemanticToDocument(root: CSSStyleDeclaration, semantic: ThemeSemantic): void {

  const as = semantic.actionSecondary;

  root.setProperty('--color-bg', semantic.background);

  root.setProperty('--color-surface', semantic.surface);

  root.setProperty('--color-sidebar', semantic.sidebar);

  root.setProperty('--color-header', semantic.header);

  root.setProperty('--color-text-primary', semantic.textPrimary);

  root.setProperty('--color-text-secondary', semantic.textSecondary);

  root.setProperty('--color-text-inverse', semantic.textInverse);

  root.setProperty('--color-action-primary', semantic.actionPrimary);

  root.setProperty('--color-action-primary-hover', semantic.actionPrimaryHover);

  root.setProperty('--color-action-primary-active', semantic.actionPrimaryActive);

  root.setProperty('--color-action-secondary-border', as.border);

  root.setProperty('--color-action-secondary-text', as.text);

  root.setProperty('--color-action-secondary-hover-bg', as.hoverBg);

  root.setProperty('--color-action-ghost', semantic.actionGhost);

  root.setProperty('--color-border', semantic.border);

  root.setProperty('--color-focus-ring', semantic.focusRing);

  root.setProperty('--text-secondary', semantic.textSecondary);

}

/**
 * Chrome lateral (SaaS): colores derivados de la escala primary + acento para el indicador activo.
 * Debe ejecutarse después de {@link applySemanticToDocument} para sobrescribir `--color-sidebar` legacy.
 */
function applySidebarChromeTokens(root: CSSStyleDeclaration, resolved: ThemeTokens, semantic: ThemeSemantic): void {
  const p = resolved.primary;
  root.setProperty('--color-sidebar', p[700]);
  root.setProperty('--color-sidebar-hover', p[600]);
  root.setProperty('--color-sidebar-active', p[500]);
  root.setProperty('--color-sidebar-text', semantic.textInverse);
  root.setProperty('--color-sidebar-text-muted', 'rgba(255, 255, 255, 0.7)');
  root.setProperty('--color-sidebar-border-indicator', resolved.accent[500]);
}



export interface ApplyDocumentThemeOptions {

  dto: Partial<BrandingColorInput>;

  /** Paleta ya generada (evita recalcular). */

  generatedTokens?: ThemeTokens;

  /** Resultado final si ya se hizo merge fuera (p. ej. preview). */

  resolvedTokens?: ThemeTokens;

  /** Overrides explícitos (si no se pasa, se usa dto.themeTokenOverrides). */

  themeTokenOverrides?: PartialThemeTokens | null;

}



/**

 * Genera paleta, merge con overrides, aplica roles semánticos (`--color-*`) y puente Material.

 */

export function applyDocumentTheme(options: ApplyDocumentThemeOptions): ThemeTokens {

  const dto = options.dto;

  const generated =

    options.generatedTokens ??

    generateThemeFromBranding(

      {

        primaryColor: dto.primaryColor ?? '#1f6feb',

        accentColor: resolveAccentColorFromDto(dto) ?? dto.accentColor,

      },

      {},

    );

  const overrides =

    options.themeTokenOverrides !== undefined ? options.themeTokenOverrides : (dto.themeTokenOverrides ?? null);

  const resolved = options.resolvedTokens ?? mergeThemeTokens(generated, overrides);

  const semantic = resolveSemanticTheme(resolved);

  const layout = resolveBrandingLayout(dto, resolved);

  const root = document.documentElement.style;



  applyColorScale(root, resolved.primary, 'primary');

  applyColorScale(root, resolved.accent, 'accent');

  applyColorScale(root, resolved.neutral, 'neutral');



  root.setProperty('--color-success', resolved.functional.success);

  root.setProperty('--color-warning', resolved.functional.warning);

  root.setProperty('--color-error', resolved.functional.error);

  root.setProperty('--color-info', resolved.functional.info);



  applySemanticToDocument(root, semantic);

  applySidebarChromeTokens(root, resolved, semantic);

  root.setProperty('--color-surface-variant', semantic.header);

  root.setProperty('--surface-variant', layout.surfaceVariant);

  root.setProperty('--on-surface', layout.textPrimary);



  root.setProperty('--color-on-primary', semantic.textInverse);

  root.setProperty('--color-primary-hover', darkenHexFactor(resolved.primary[500], 0.15));

  root.setProperty('--color-accent-hover', darkenHexFactor(resolved.accent[500], 0.12));

  root.setProperty('--color-action-cancel', layout.actionCancel);

  root.setProperty('--color-action-cancel-hover', darkenHexFactor(layout.actionCancel, 0.12));



  applyMaterialBridge(root, resolved.primary[500], resolved.accent[500], layout, semantic);

  const modeRaw =
    (dto as { themeModeDefault?: string }).themeModeDefault ?? 'light';
  const m = String(modeRaw).toLowerCase();
  if (typeof document !== 'undefined' && document.body) {
    document.body.setAttribute(
      'data-theme',
      m === 'dark' ? 'dark' : m === 'system' ? 'system' : 'light',
    );
  }

  return resolved;

}


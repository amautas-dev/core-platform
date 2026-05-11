import { Injectable } from '@angular/core';
import { resolveAccentColorFromDto } from './branding-legacy';
import { generateTheme, generateThemeFromBranding, type GenerateThemeInput, type GenerateThemeOptions } from './theme-generator';
import type { ThemeTokens } from './theme-tokens';
import type { BrandingColorInput } from './branding.types';
import { mergeThemeTokens, type PartialThemeTokens } from './theme-token-merge';

/**
 * Capa multi-tenant: misma generación de paleta que la plataforma global.
 * La aplicación al DOM global sigue centralizada en {@link applyDocumentTheme} vía {@link PlatformSettingsService}.
 */
@Injectable({ providedIn: 'root' })
export class TenantThemeService {
  generateFromInputs(input: GenerateThemeInput, options?: GenerateThemeOptions): ThemeTokens {
    return generateTheme(input, options ?? {});
  }

  /** Tokens de marca a partir de los mismos campos que el branding de plataforma (sin side-effects). */
  tokensFromBranding(dto: Partial<BrandingColorInput>): ThemeTokens {
    return generateThemeFromBranding(
      {
        primaryColor: dto.primaryColor ?? '#1f6feb',
        accentColor: resolveAccentColorFromDto(dto) ?? dto.accentColor,
      },
      {},
    );
  }

  /** Paleta final con overrides (misma lógica que vista previa / guardado). */
  resolvedTokensFromBranding(
    dto: Partial<BrandingColorInput>,
    overrides: PartialThemeTokens | null | undefined,
  ): ThemeTokens {
    return mergeThemeTokens(this.tokensFromBranding(dto), overrides);
  }
}

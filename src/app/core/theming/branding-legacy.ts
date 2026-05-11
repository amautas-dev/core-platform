import type { BrandingColorInput } from './branding.types';
import { resolveSemanticTheme } from './theme-semantic-generator';
import type { ThemeTokens } from './theme-tokens';

/**
 * `accentColor` explícito, o valores antiguos (`buttonSecondaryColor` distinto del secundario, `tertiaryColor`).
 */
export function resolveAccentColorFromDto(dto: Partial<BrandingColorInput>): string | undefined {
  if (dto.accentColor?.trim()) return dto.accentColor.trim();
  const btnSec = dto.buttonSecondaryColor?.trim();
  if (btnSec) return btnSec;
  if (dto.tertiaryColor?.trim()) return dto.tertiaryColor.trim();
  return undefined;
}

/**
 * Columnas legacy del API rellenadas desde el tema generado (sidebar/header/fondo/texto/botones).
 */
export function legacyColumnsFromTokens(tokens: ThemeTokens): {
  sidebarBgColor: string;
  headerBgColor: string;
  pageBackgroundColor: string;
  buttonPrimaryColor: string;
  buttonSecondaryColor: string;
  textColor: string;
} {
  const s = resolveSemanticTheme(tokens);
  return {
    sidebarBgColor: s.sidebar,
    headerBgColor: s.header,
    pageBackgroundColor: s.background,
    buttonPrimaryColor: tokens.primary[500],
    buttonSecondaryColor: tokens.accent[500],
    textColor: s.textPrimary,
  };
}

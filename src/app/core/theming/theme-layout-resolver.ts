import type { BrandingColorInput } from './branding.types';

import { normalizeHexColor } from './theme-generator';

import type { ActionSecondaryRole } from './theme-semantic';

import { resolveSemanticTheme } from './theme-semantic-generator';

import type { ThemeTokens } from './theme-tokens';



/**

 * Superficies y textos alineados a {@link resolveSemanticTheme}.

 * Solo `actionCancel` puede venir del DTO (botón neutro).

 */

export interface ResolvedBrandingLayout {

  background: string;

  surface: string;

  /** Barra superior / cabecera de zona (= semantic.header) */

  surfaceVariant: string;

  textPrimary: string;

  textSecondary: string;

  border: string;

  sidebarBg: string;

  actionPrimary: string;

  /** Outline secundario (borde / texto / hover) — rol UI, no marca */

  actionSecondary: ActionSecondaryRole;

  actionCancel: string;

}



/**

 * Resuelve layout desde la paleta generada (roles semánticos).

 */

export function resolveBrandingLayout(

  dto: Partial<BrandingColorInput>,

  tokens: ThemeTokens,

): ResolvedBrandingLayout {

  const s = resolveSemanticTheme(tokens);

  const buttonCancel = normalizeHexColor(dto.buttonCancelColor?.trim() || '#3a383d', '#3a383d');



  return {

    background: s.background,

    surface: s.surface,

    surfaceVariant: s.header,

    textPrimary: s.textPrimary,

    textSecondary: s.textSecondary,

    border: s.border,

    sidebarBg: s.sidebar,

    actionPrimary: s.actionPrimary,

    actionSecondary: s.actionSecondary,

    actionCancel: buttonCancel,

  };

}


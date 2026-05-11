import { hexToRgba } from './theme-generator';

import type { ThemeSemantic } from './theme-semantic';

import type { ThemeTokens } from './theme-tokens';



/**

 * Mapea escalas generadas a superficies y acciones coherentes.

 * - Layout: primary + neutral (el acento no pinta chrome)

 * - Secundario UI: outline sobre primary[500] (rol, no escala de marca)

 */

export function resolveSemanticTheme(tokens: ThemeTokens): ThemeSemantic {

  const p = tokens.primary;

  const n = tokens.neutral;

  const actionPrimary = p[500];

  const base = p[500];



  return {

    background: n[50],

    surface: '#ffffff',

    sidebar: p[700],

    header: p[600],

    textPrimary: n[900],

    textSecondary: n[600],

    textInverse: '#ffffff',

    actionPrimary,

    actionPrimaryHover: p[600],

    actionPrimaryActive: p[700],

    actionSecondary: {

      border: base,

      text: base,

      hoverBg: hexToRgba(base, 0.08),

    },

    actionGhost: n[100],

    focusRing: p[400],

    border: n[200],

  };

}



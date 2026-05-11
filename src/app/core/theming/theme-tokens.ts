/**
 * Contrato único de tokens de color para Platform Admin y futuros tenants.
 * Los valores concretos se generan con {@link generateTheme} y se proyectan a CSS (--color-*).
 */
export const COLOR_SCALE_STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

export type ColorStop = (typeof COLOR_SCALE_STOPS)[number];

export type ColorScale = Record<ColorStop, string>;

export interface ThemeFunctionalColors {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeTokens {
  primary: ColorScale;
  /** Acento (badges, links, highlights); no usado para layout chrome */
  accent: ColorScale;
  neutral: ColorScale;
  functional: ThemeFunctionalColors;
}

/** Overrides planos tipo { '--color-primary-500': '#abc' } o claves sin prefijo para merge controlado */
export type ThemeTokenCssOverrides = Record<string, string>;

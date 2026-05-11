import { generateTheme } from './theme-generator';
import type { ThemeTokens } from './theme-tokens';

/** Entrada por defecto alineada con `brand.css` (primera pintura sin API). */
export const DEFAULT_THEME_GENERATOR_INPUT = {
  primary: '#1f6feb',
  secondary: '#4dd2f0',
} as const;

/** Paleta base de la plataforma (identidad + acento). */
export const DEFAULT_THEME_TOKENS: ThemeTokens = generateTheme(DEFAULT_THEME_GENERATOR_INPUT, {});

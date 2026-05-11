import type { PartialThemeTokens } from './theme-token-merge';

/**
 * Entrada de marca para el generador: solo colores elegidos por el usuario.
 * Fondos de layout (sidebar, header, lienzo) se derivan en {@link resolveSemanticTheme}.
 */
export interface BrandingColorInput {
  /** Color primario de marca (requerido en formularios; fallback en runtime `#1f6feb`) */
  primaryColor?: string;
  /** Acento para highlights, badges, links (opcional); no define chrome de layout */
  accentColor?: string;
  fontFamily?: string | null;
  /** Overrides por escala (merge sobre la paleta generada) */
  themeTokenOverrides?: PartialThemeTokens | null;

  /**
   * @deprecated Solo lectura compat API: mapear a overrides o ignorar en UI.
   * No editar desde el formulario de branding.
   */
  sidebarBgColor?: string;
  headerBgColor?: string;
  pageBackgroundColor?: string | null;
  buttonPrimaryColor?: string;
  buttonSecondaryColor?: string;
  /** @deprecated API legado; se ignora en la generación de tema */
  secondaryColor?: string;
  buttonCancelColor?: string | null;
  textColor?: string;
  /** @deprecated usar accentColor */
  tertiaryColor?: string;
  /** Preferencia por defecto para `document.body[data-theme]` (runtime dark completo pendiente). */
  themeModeDefault?: 'light' | 'dark' | 'system';
}

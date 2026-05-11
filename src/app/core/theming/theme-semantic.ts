/**

 * Rol UI para botón secundario (outline): deriva del primario, no de una escala “secondary” de marca.

 */

export interface ActionSecondaryRole {

  border: string;

  text: string;

  hoverBg: string;

}



/**

 * Roles semánticos de UI derivados de la paleta generada (primary + neutral + accent).

 * El acento de marca no define layout; el secundario UI es outline sobre primary[500].

 */

export interface ThemeSemantic {

  background: string;

  surface: string;

  sidebar: string;

  header: string;

  textPrimary: string;

  textSecondary: string;

  textInverse: string;

  actionPrimary: string;

  actionPrimaryHover: string;

  actionPrimaryActive: string;

  actionSecondary: ActionSecondaryRole;

  /** Fondo sutil para botones tipo texto / ghost */

  actionGhost: string;

  /** Anillo de foco visible (p. ej. focus-visible) */

  focusRing: string;

  border: string;

}



export interface MenuItem {
  readonly id: number;
  readonly label: string;
  readonly icon: string;
  /** Route path for routerLink. */
  readonly path: string;
  readonly order: number;
  /** Permission required to see and access this item (e.g. "users.read"). Omit for no restriction. */
  readonly permission?: string;
  /** Si está definido, basta con tener **una** de estas (OR). Tiene prioridad sobre `permission`. */
  readonly anyOfPermissions?: readonly string[];
  /** Resalta el ítem del menú si la URL actual empieza por este prefijo (p. ej. `/catalog` para todo el catálogo). */
  readonly activeWhenUrlStartsWith?: string;
  /** Si hay rutas localizadas (p. ej. `/catalog` y `/catalogo`), activa si coincide cualquiera. */
  readonly activeWhenUrlStartsWithAny?: readonly string[];
  readonly children?: readonly MenuItem[];
  /** i18n key for label (e.g. "menu.dashboard"). If set, label is used as fallback. */
  readonly translationKey?: string;
}

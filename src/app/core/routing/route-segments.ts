/**
 * Segmentos de URL por idioma (barra de direcciones alineada con el idioma de la UI).
 * Es / En deben mantenerse en sync con `shell.routes.ts`.
 */
export const SEG = {
  dashboard: { es: 'panel', en: 'dashboard' },
  catalog: { es: 'catalogo', en: 'catalog' },
  products: { es: 'productos', en: 'products' },
  servicePlans: { es: 'planes-de-servicio', en: 'service-plans' },
  modules: { es: 'modulos', en: 'modules' },
  features: { es: 'funcionalidades', en: 'features' },
  /** Roles de consola del producto (tenant users), catálogo platform */
  consoleRoles: { es: 'roles-consola', en: 'console-roles' },
  tenants: { es: 'empresas', en: 'tenants' },
  /** Facturación / planes (tenant) */
  billing: { es: 'facturacion', en: 'billing' },
  users: { es: 'usuarios', en: 'users' },
  translations: { es: 'traducciones', en: 'translations' },
  settings: { es: 'configuracion', en: 'settings' },
  profile: { es: 'perfil', en: 'profile' },
  systemHealth: { es: 'estado-del-sistema', en: 'system-health' },
  create: { es: 'crear', en: 'create' },
  edit: { es: 'editar', en: 'edit' },
  roles: { es: 'roles', en: 'roles' },
} as const;

export type RouteLocale = 'es' | 'en';

export function pickSeg<T extends Record<RouteLocale, string>>(o: T, lang: RouteLocale): string {
  return o[lang];
}

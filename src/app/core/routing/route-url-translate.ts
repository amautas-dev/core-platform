/**
 * Traduce el pathname entre variantes es/en (alineado con `shell.routes.ts`).
 */
export type UrlLang = 'es' | 'en';

function norm(p: string): string {
  if (!p || p === '/') return '/';
  const x = p.startsWith('/') ? p : `/${p}`;
  return x.replace(/\/+$/, '') || '/';
}

const TO_EN: Array<[RegExp, string]> = [
  [/^\/catalogo\/productos\/([^/]+)\/editar$/, '/catalog/products/$1/edit'],
  [/^\/catalogo\/productos\/crear$/, '/catalog/products/create'],
  [/^\/catalogo\/productos\/([^/]+)$/, '/catalog/products/$1'],
  [/^\/catalogo\/productos$/, '/catalog/products'],
  [/^\/catalogo\/planes-de-servicio\/([^/]+)\/editar$/, '/catalog/service-plans/$1/edit'],
  [/^\/catalogo\/planes-de-servicio\/crear$/, '/catalog/service-plans/create'],
  [/^\/catalogo\/planes-de-servicio\/([^/]+)$/, '/catalog/service-plans/$1'],
  [/^\/catalogo\/planes-de-servicio$/, '/catalog/service-plans'],
  [/^\/catalogo\/modulos\/crear$/, '/catalog/modules/create'],
  [/^\/catalogo\/modulos\/([^/]+)$/, '/catalog/modules/$1'],
  [/^\/catalogo\/modulos$/, '/catalog/modules'],
  [/^\/catalogo\/funcionalidades\/crear$/, '/catalog/features/create'],
  [/^\/catalogo\/funcionalidades\/([^/]+)\/editar$/, '/catalog/features/$1/edit'],
  [/^\/catalogo\/funcionalidades$/, '/catalog/features'],
  [/^\/catalogo\/roles-consola\/([^/]+)$/, '/catalog/console-roles/$1'],
  [/^\/catalogo\/roles-consola$/, '/catalog/console-roles'],
  [/^\/catalogo$/, '/catalog'],
  [/^\/empresas\/([^/]+)\/facturacion$/, '/tenants/$1/billing'],
  [/^\/empresas\/([^/]+)\/editar$/, '/tenants/$1/edit'],
  [/^\/empresas\/crear$/, '/tenants/create'],
  [/^\/empresas\/([^/]+)$/, '/tenants/$1'],
  [/^\/empresas$/, '/tenants'],
  [/^\/usuarios\/roles\/crear$/, '/users/roles/create'],
  [/^\/usuarios\/roles\/([^/]+)$/, '/users/roles/$1'],
  [/^\/usuarios\/roles$/, '/users/roles'],
  [/^\/usuarios\/crear$/, '/users/create'],
  [/^\/usuarios\/([^/]+)$/, '/users/$1'],
  [/^\/usuarios$/, '/users'],
  [/^\/panel$/, '/dashboard'],
  [/^\/traducciones$/, '/translations'],
  [/^\/configuracion$/, '/settings'],
  [/^\/perfil$/, '/profile'],
  [/^\/estado-del-sistema$/, '/system-health'],
];

const TO_ES: Array<[RegExp, string]> = [
  [/^\/catalog\/products\/([^/]+)\/edit$/, '/catalogo/productos/$1/editar'],
  [/^\/catalog\/products\/create$/, '/catalogo/productos/crear'],
  [/^\/catalog\/products\/([^/]+)$/, '/catalogo/productos/$1'],
  [/^\/catalog\/products$/, '/catalogo/productos'],
  [/^\/catalog\/service-plans\/([^/]+)\/edit$/, '/catalogo/planes-de-servicio/$1/editar'],
  [/^\/catalog\/service-plans\/create$/, '/catalogo/planes-de-servicio/crear'],
  [/^\/catalog\/service-plans\/([^/]+)$/, '/catalogo/planes-de-servicio/$1'],
  [/^\/catalog\/service-plans$/, '/catalogo/planes-de-servicio'],
  [/^\/catalog\/modules\/create$/, '/catalogo/modulos/crear'],
  [/^\/catalog\/modules\/([^/]+)$/, '/catalogo/modulos/$1'],
  [/^\/catalog\/modules$/, '/catalogo/modulos'],
  [/^\/catalog\/features\/create$/, '/catalogo/funcionalidades/crear'],
  [/^\/catalog\/features\/([^/]+)\/edit$/, '/catalogo/funcionalidades/$1/editar'],
  [/^\/catalog\/features$/, '/catalogo/funcionalidades'],
  [/^\/catalog\/console-roles\/([^/]+)$/, '/catalogo/roles-consola/$1'],
  [/^\/catalog\/console-roles$/, '/catalogo/roles-consola'],
  [/^\/catalog$/, '/catalogo'],
  [/^\/tenants\/([^/]+)\/billing$/, '/empresas/$1/facturacion'],
  [/^\/tenants\/([^/]+)\/edit$/, '/empresas/$1/editar'],
  [/^\/tenants\/create$/, '/empresas/crear'],
  [/^\/tenants\/([^/]+)$/, '/empresas/$1'],
  [/^\/tenants$/, '/empresas'],
  [/^\/users\/roles\/create$/, '/usuarios/roles/crear'],
  [/^\/users\/roles\/([^/]+)$/, '/usuarios/roles/$1'],
  [/^\/users\/roles$/, '/usuarios/roles'],
  [/^\/users\/create$/, '/usuarios/crear'],
  [/^\/users\/([^/]+)$/, '/usuarios/$1'],
  [/^\/users$/, '/usuarios'],
  [/^\/dashboard$/, '/panel'],
  [/^\/translations$/, '/traducciones'],
  [/^\/settings$/, '/configuracion'],
  [/^\/profile$/, '/perfil'],
  [/^\/system-health$/, '/estado-del-sistema'],
];

export function translateUrlPath(pathname: string, targetLang: UrlLang): string {
  const p = norm(pathname);
  const rules = targetLang === 'en' ? TO_EN : TO_ES;
  for (const [re, repl] of rules) {
    if (re.test(p)) {
      return norm(p.replace(re, repl));
    }
  }
  return p;
}

# Colores, branding y UI — Platform Admin

Este archivo **no** duplica tablas de tokens ni reglas de layout. La documentación canónica está en el monorepo bajo `docs/design-system/`.

## Documentación canónica

| Tema | Enlace |
|------|--------|
| Tokens y mapeo a CSS | [../../../docs/design-system/01-TOKENS-V1.md](../../../docs/design-system/01-TOKENS-V1.md) |
| Roles de color (identidad vs CTA, cancel, Material) | [../../../docs/design-system/06-COLOR-ROLES-PLATFORM-ADMIN.md](../../../docs/design-system/06-COLOR-ROLES-PLATFORM-ADMIN.md) |
| Patrones de UI (botones, modales, tablas, mobile) | [../../../docs/design-system/07-UI-PATTERNS-PLATFORM-ADMIN.md](../../../docs/design-system/07-UI-PATTERNS-PLATFORM-ADMIN.md) |
| Índice y reglas de mantenimiento | [../../../docs/design-system/README.md](../../../docs/design-system/README.md) |

## Dónde está implementado en esta app

| Qué | Dónde |
|-----|--------|
| Variables por defecto | `src/styles/brand.css` |
| Overrides globales (Material, tabs, botones, etc.) | `src/styles.scss` |
| Aplicación en runtime tras Branding | `src/app/features/platform-settings/services/platform-settings.service.ts` (`applyBrandingToDocument`) |

Si cambian nombres de variables o reglas de negocio de color, actualizar **primero** `docs/design-system/` y el código; este archivo solo debe seguir enlazando correctamente.

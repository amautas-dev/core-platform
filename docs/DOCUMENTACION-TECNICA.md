# Documentación Técnica - Distali Admin

Sistema de administración para distribuidora. Esta documentación describe la arquitectura, stack, flujos de datos y decisiones técnicas incorporadas en la aplicación.

---

## 1. Stack y dependencias

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Angular | 20.x | Framework SPA, standalone components, signals |
| TypeScript | 5.8.x | Tipado estático |
| RxJS | 7.8.x | Programación reactiva y HTTP |
| Angular Material | 20.x | Componentes UI (form-field, dialog, table, etc.) |
| Angular CDK | 20.x | Layout, overlay, breakpoints |
| **ui-kit** | (externo) | DbService (CRUD API), componentes, pipes, directivas, validadores |
| date-fns | 4.x | Fechas |
| crypto-js | 4.x | Encriptación |
| @angular/google-maps | 20.x | Mapas (entregas, clientes) |
| chart.js / ng2-charts | 4.x | Gráficos en dashboards |
| ngx-dropzone | 3.x | Carga de archivos |

- **Node.js**: 18+ (recomendado 22.x para CI/CD).
- **Build**: `@angular/build` (esbuild). Configuraciones: `development`, `dev`, `production`.
- **Lazy loading**: Rutas por feature (dashboard por rol, pedidos, clientes, finanzas, etc.).

---

## 2. Estructura de la aplicación

```
src/app/
├── core/           # Infraestructura reutilizable (base)
├── domain/         # Modelos e interfaces + servicios de datos (negocio)
├── features/       # Módulos por funcionalidad (negocio + UI)
└── layout/        # Shell, header, sidebar
```

- **Core**: independiente del negocio. Auth, guards, interceptors, servicios de error/loading/logging, permisos, sesión, directivas (`hasPermission`, `selectOnFocus`), configuración.
- **Domain**: interfaces en `domain/models/`, lógica de datos y reglas en `domain/services/` y `domain/auth/`.
- **Features**: componentes standalone por pantalla/diálogo; consumen domain y core; rutas lazy cuando aplica.

---

## 3. Autenticación y autorización

- **Login**: `AuthService` (hereda de `BaseAuthService` de ui-kit). Credenciales → API login → token JWT almacenado; sesión en `SessionDataService` (señales + `localStorage`).
- **Token**: `AuthInterceptor` agrega el header de autorización a las peticiones HTTP.
- **Guards**:
  - `authGuard`: rutas que requieren usuario logueado.
  - `authMatchGuard`: evita cargar el shell si no hay sesión.
  - `devAdminGuard`: solo para rol desarrollo/admin (rutas `admin-dev`, `roles`, etc.).
  - `setupGuard`: flujo de configuración inicial.
- **Redirección post-login**: `RoleRedirectService` según `idRol`: 1 → dashboard admin, 2 → gestión, 3/5 → vendedor, 4 → repartidor.
- **Permisos**: `PermissionService`, directiva `hasPermission` para mostrar/ocultar por funcionalidad/rol. Menú y rutas se filtran según permisos.

---

## 4. Sesión y estado global

- **SessionDataService** (core): estado reactivo con señales: `user`, `idZona`, `idRol`, `nombreZona`. Persistencia en `localStorage` bajo la clave `session-data`. Expone `idUsuario`, `idRol`, `idZona`, `isAdmin` (rol 1 o 2), `isAmautasAdmin`.
- **SessionData** (domain): `idUsuario`, `idPersona`, `nombre`, `email`, `idRol`, `idZona`, `nombreZona`, `idVendedor`, `idRepartidor`, `isAmautasAdmin`. Usado tras el login para poblar la sesión.

---

## 5. Comunicación con el backend (ui-kit)

- **DbService** (ui-kit): capa de acceso a datos. Métodos típicos: `list`, `listFull` (con filtros, joins, orden), `getById`, `create`, `update`, `deactivate`, `createMany`. Entidades referenciadas en la app: `Cliente`, `Pedido`, `DetallePedido`, `PagoPedido`, `Carga`, `PedidoxCarga`, `DevolucionEntrega`, `Rendicion`, `RendicionPago`, `SaldoManualCliente`, `PagoSaldoManual`, `VisitaCliente`, etc.
- **Filtros y joins**: se pasan en opciones por entidad (ej. `filters: [{ field, op, value }]`, `joins: ['Cliente', 'Vendedor.Usuario.Persona']`). Soft delete mediante `esActivo = 1` en filtros.
- **Identificación de usuario**: `DbService.getUserId()` para `idUsuarioAlta` / `idUsuarioBaja` en altas/bajas lógicas.

---

## 6. Interceptores HTTP

- **ErrorInterceptor**: captura errores HTTP, delega en `ErrorHandlingService`, logging y notificación al usuario.
- **LoadingInterceptor**: activa/desactiva estado de carga global (`LoadingService`).
- **RetryInterceptor**: reintentos configurables para peticiones fallidas.

Los interceptores se registran en `app.config.ts` en el orden que aplique (auth, error, loading, retry).

---

## 7. Rutas principales

- **Públicas**: `/login`.
- **Protegidas** (dentro del shell, con `authGuard` + `authMatchGuard`):
  - Dashboards: `/dashboard`, `/dashboard/admin`, `/dashboard/gestion`, `/dashboard/vendedor`, `/dashboard/repartidor`, `/dashboard/mixto`.
  - Pedidos: `/pedidos`, `/admin-pedido`, `/admin-pedido/:idPedido`.
  - Clientes: `/clientes`.
  - Distribución: `/distribucion` (carga), `/distribucion/configurar-carga`, `/admin/distribucion/devolucion-entrega/:idCarga`.
  - Entregas: `/entregas`, `/entregas/:id`.
  - Finanzas: `/finanzas`.
  - Productos: `/productos`, `/productos/listas-precios`, `/productos/no-comerciales`.
  - Config: `/config`, `/config/marca`, `/config/categoria`, etc.
  - Usuarios: `/usuarios`; `/roles` (con `devAdminGuard`).
  - Común: `/log-eventos`, `/permisos`.
  - Admin-dev: `/admin-dev`, `/admin-dev/funcionalidades`, `/admin-dev/configuracion-cliente` (con `devAdminGuard`).
- Default: `''` → redirect a `dashboard`.

---

## 8. Patrones de componentes y datos

- **Standalone**: todos los componentes son standalone; imports de módulos Material y de ui-kit en el array `imports` del componente.
- **Señales**: uso de `signal()`, `computed()` y `effect()` para estado local y derivado (ej. listas filtradas, totales, saldos). En formularios reactivos se combina con `ngModel` o `FormGroup` según el caso.
- **Async**: uso de `Observable` (RxJS) en servicios; en componentes se suscriben con `subscribe`, `async` pipe o `firstValueFrom`/`lastValueFrom` cuando se necesita promesa.
- **Lazy load**: rutas con `loadChildren` o `loadComponent` para dashboards, pedidos, clientes, distribucion, finanzas, etc., para reducir el bundle inicial.

---

## 9. Formularios y validación

- **Formularios**: principalmente `FormsModule` (`ngModel`, `ngModelChange`) y en algunos flujos `ReactiveFormsModule`. Controles Material (`mat-form-field`, `mat-input`, `mat-select`, etc.).
- **Moneda**: directiva `uiMonedaInput` (ui-kit) en inputs de monto: acepta punto/coma como decimal, formatea en blur a formato argentino (ej. 1.234,56). Pipe `currencyFormat` para solo lectura.
- **Número de comprobante (transferencia/cheque)**: método `soloSeisDigitos(val)` en componentes que lo usan; en template se llama desde `ngModelChange` para restringir a 6 dígitos; `maxlength="6"`, `inputmode="numeric"`, placeholder "Ingrese últimos 6 dígitos".
- **Validadores**: uso de validadores de ui-kit y de Angular donde aplica (required, email, etc.).

---

## 10. Estilos y temas

- **Global**: `src/styles.scss` importa tema y utilidades de marca; estilos unificados para diálogos (`.mat-dialog-container`), headers de diálogo, y hints (ej. `.hint-seis-digitos`).
- **Por componente**: archivos `.scss` por feature/componente; encapsulación por defecto. Uso de `::ng-deep` solo donde se necesita (ej. Material) en contenedores globales.
- **Responsive**: `BreakpointObserver` (CDK) para detectar handset/mobile y adaptar layout (ej. registrar-entrega, listas).

---

## 11. Logging y auditoría

- **LoggingService** (core): registro de eventos de aplicación.
- **Log de eventos** (feature): pantalla que consulta y muestra historial de eventos/auditoría (queries guardadas, etc.) para trazabilidad.

---

## 12. Carga de archivos y documentos

- **DocumentoUploadService** (core): centraliza subida de archivos (ej. documentos de respaldo en devoluciones). Uso de `ngx-dropzone` en los componentes que lo requieren.

---

## 13. Configuración y entornos

- **environment**: `environment.ts`, `environment.dev.ts`, `environment.prod.ts` con `production`, `apiUrl`, `GMapsApiKey`, `errorNotificationEmail`, etc.
- **app.config.ts**: providers de la aplicación, interceptores, configuración de ui-kit (DbService, date adapter, etc.).
- **Configuración de proyecto**: si existe, inyección por tokens en `core/config` para opciones globales.

---

## 14. Testing y calidad

- **Tests**: Karma + Jasmine; specs junto a componentes (`*.spec.ts`).
- **Lint**: configuración ESLint/TSLint según el proyecto.
- **CI**: workflows en `.github/workflows` (ci.yml, release.yml) para build y despliegue.

---

## 15. Convenciones de código

- **Servicios de datos**: sufijo `*-data.service.ts` en `domain/services/`.
- **Modelos**: `*.interface.ts` en `domain/models/` (y `_common` para compartidos).
- **Guards**: `*.guard.ts`; interceptores: `*.interceptor.ts`.
- **Imports**: ui-kit desde `'ui-kit'`; core desde `'../../core/...'`; domain desde `'../../domain/...'` según profundidad del feature.
- **Nombres de entidades**: PascalCase en interfaces y servicios; nombres de tablas/endpoints según API (ej. `PagoPedido`, `DevolucionEntrega`).

---

**Última actualización:** Febrero 2026

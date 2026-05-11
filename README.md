# DistaliAdmin

Sistema de administración completo para gestión de distribuidora - Angular 20

**Documentación Amautas (arquitectura, monetización, roles Platform vs Console):** [../../docs/architecture-apps-and-monetization.md](../../docs/architecture-apps-and-monetization.md) · Engineering: [../../docs/engineering/README.md](../../docs/engineering/README.md)

**Versión:** 1.0.0  
**Angular:** ^20.1.0  
**Node.js:** 18+ (22.12.0 recomendado para CI/CD)  
**Estado:** Producción

---

## 📋 Tabla de Contenidos

1. [Descripción](#descripción)
2. [Funcionalidades](#funcionalidades)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Instalación](#instalación)
5. [Desarrollo](#desarrollo)
6. [Arquitectura](#arquitectura)
7. [Tecnologías](#tecnologías)
8. [Configuración](#configuración)
9. [Convenciones](#convenciones)

---

## 🎯 Descripción

Sistema de administración completo para gestión de distribuidora, construido con Angular 20 siguiendo una arquitectura **feature-based** con separación clara entre lógica base (reutilizable) y lógica de negocio (específica del dominio).

### Características Principales

- ✅ **Arquitectura Escalable** - Separación base vs negocio para máxima reutilización
- ✅ **Feature-Based** - Organización modular por funcionalidades
- ✅ **UI-Kit Integration** - Componentes y utilidades reutilizables
- ✅ **TypeScript Estricto** - Tipado fuerte, sin `any`
- ✅ **Angular Signals** - Reactividad moderna
- ✅ **Standalone Components** - Sin NgModules
- ✅ **Multi-rol** - Dashboards y permisos por rol
- ✅ **Sistema de Logging** - Trazabilidad completa de eventos
- ✅ **Interceptores HTTP** - Manejo centralizado de errores, loading y autenticación

---

## 🎨 Funcionalidades

### Módulos Principales

- **👥 Clientes** - Gestión completa de clientes, asignación a vendedores/repartidores, zonas
- **📦 Pedidos** - Creación, edición, seguimiento y administración de pedidos
- **🛍️ Productos** - Catálogo completo, categorías, marcas, subcategorías, listas de precios, stock
- **👤 Usuarios** - Gestión de usuarios, roles y permisos
- **💰 Finanzas** - Cuentas corrientes, pagos, rendiciones, compromisos con proveedores
- **🚚 Distribución** - Gestión de cargas, entregas, zonas y repartidores
- **📊 Dashboards** - Vistas personalizadas por rol (Admin, Gestión, Vendedor, Repartidor, Mixto)
- **⚙️ Configuración** - Marcas, categorías, subcategorías, zonas, proveedores
- **📝 Log de Eventos** - Auditoría y trazabilidad de acciones del sistema

### Roles del Sistema

- **Admin** - Acceso completo al sistema
- **Gestión** - Administración operativa
- **Vendedor** - Gestión de clientes y pedidos asignados
- **Repartidor** - Gestión de entregas y distribución
- **Mixto** - Combinación de roles vendedor/repartidor

---

## 📁 Estructura del Proyecto

```
src/app/
├── core/                    # 🟦 BASE - Infraestructura genérica
│   ├── auth/               # Autenticación y autorización
│   │   ├── base/          # BaseAuthService genérico
│   │   ├── login/         # Componente de login
│   │   ├── auth.service.ts
│   │   ├── auth.guard.ts
│   │   ├── auth.interceptor.ts
│   │   ├── dev-admin.guard.ts
│   │   └── setup.guard.ts
│   ├── services/           # Servicios base
│   │   ├── error-handling.service.ts
│   │   ├── logging.service.ts
│   │   ├── loading.service.ts
│   │   ├── permission.service.ts
│   │   ├── session-data.service.ts
│   │   ├── setup.service.ts
│   │   └── documento-upload.service.ts
│   ├── interceptors/       # Interceptores HTTP
│   │   ├── error.interceptor.ts
│   │   ├── loading.interceptor.ts
│   │   └── retry.interceptor.ts
│   ├── config/             # Configuración base
│   ├── directives/         # Directivas reutilizables
│   └── utils/              # Utilidades base
│
├── domain/                  # 🟨 NEGOCIO - Lógica específica
│   ├── models/             # Modelos del dominio (40+ interfaces)
│   │   ├── _common/       # Modelos comunes (Usuario, Rol, Permiso, etc.)
│   │   ├── cliente.interface.ts
│   │   ├── pedido.interface.ts
│   │   ├── producto.interface.ts
│   │   └── ...
│   ├── services/           # Servicios de datos (30+ servicios)
│   │   ├── cliente-data.service.ts
│   │   ├── pedido-data.service.ts
│   │   ├── producto-*.service.ts
│   │   └── ...
│   └── auth/              # Lógica de auth específica
│       └── role-redirect.service.ts
│
├── features/                # 🟨 NEGOCIO - Features del dominio
│   ├── _common/           # Componentes comunes entre features
│   ├── admin-dev/         # Herramientas de desarrollo admin
│   ├── carga/             # Gestión de cargas y distribución
│   ├── clientes/          # Gestión de clientes
│   ├── configuracion/     # Configuración del sistema
│   ├── dashboard/         # Dashboards por rol
│   │   ├── admin/
│   │   ├── gestion/
│   │   ├── vendedor/
│   │   ├── repartidor/
│   │   ├── mixto/
│   │   └── widgets/
│   ├── distribucion/      # Gestión de distribución
│   ├── entregas-pendientes/
│   ├── finanzas/          # Módulo financiero completo
│   ├── pedido/            # Gestión de pedidos
│   ├── productos/         # Gestión de productos
│   ├── registrar-entrega/
│   ├── repartidores/      # Gestión de repartidores
│   ├── seleccionar-zona/
│   ├── setup/             # Configuración inicial
│   ├── usuarios/          # Gestión de usuarios
│   └── vendedores/        # Gestión de vendedores
│
└── layout/                  # 🟦 BASE - Componentes de layout
    ├── header/            # Barra superior
    ├── sidebar/           # Menú lateral
    └── shell/             # Contenedor principal
```

---

## 🚀 Instalación

### Prerrequisitos

- **Node.js** 18+ (recomendado 22.12.0 para CI/CD)
- **npm** 9+
- **Angular CLI** 20+

### Pasos

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd distali-admin
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar UI-Kit (si es necesario)**
```bash
# Si usas npm link para desarrollo local
npm run link:ui

# Verificar instalación
npm run doctor:ui
```

4. **Configurar variables de entorno**

Editar `src/environments/environment.ts`:
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://dev.distribuidoraali.com.ar/api',
  GMapsApiKey: 'tu-api-key',
  errorNotificationEmail: 'email@ejemplo.com',
};
```

5. **Iniciar servidor de desarrollo**
```bash
npm start
# o
ng serve
```

Navegar a `http://localhost:4200/`

---

## 💻 Desarrollo

### Comandos Disponibles

```bash
# Desarrollo
npm start              # Inicia servidor de desarrollo (configuración development)
npm run start:dev      # Inicia con configuración dev
npm run start:prod     # Inicia con configuración production
npm run build          # Compila para producción
npm run build:dev      # Compila con configuración dev
npm run build:prod     # Compila con configuración production
npm run watch          # Compila en modo watch

# Testing
npm test               # Ejecuta tests unitarios
npm run lint           # Ejecuta linter

# UI-Kit
npm run link:ui        # Linkear UI-Kit local
npm run relink:ui      # Re-linkear UI-Kit
npm run unlink:ui      # Deslinkear UI-Kit
npm run doctor:ui      # Verificar estado de UI-Kit

# Limpieza
npm run clean          # Limpiar node_modules y cache
npm run reinstall      # Reinstalar dependencias
```

### Configuraciones de Build

El proyecto tiene tres configuraciones de build:

- **development** (default) - Sin optimizaciones, con source maps
- **dev** - Optimizado para desarrollo, sin source maps
- **production** - Optimizado para producción, sin source maps

### Generar Componentes

```bash
# Componente standalone
ng generate component features/nombre-feature/nombre-componente --standalone

# Servicio
ng generate service domain/services/nombre-service

# Modelo/Interface
ng generate interface domain/models/nombre.interface
```

---

## 🏗️ Arquitectura

### Visión General

Este proyecto sigue una arquitectura **feature-based** con separación clara entre:

- **🟦 BASE (Core/Shared/Layout)**: Infraestructura reutilizable, genérica, independiente del negocio
- **🟨 NEGOCIO (Domain/Features)**: Lógica específica del dominio, reglas de negocio, modelos y servicios de datos

Esta separación permite:
- ✅ Reutilizar la base en otros proyectos
- ✅ Mantener el código organizado y escalable
- ✅ Facilitar el testing y mantenimiento
- ✅ Separar responsabilidades claramente

### Separación Base vs Negocio

#### 🟦 BASE (Reutilizable)

**Características:**
- ✅ Independiente del dominio
- ✅ Reutilizable en otros proyectos
- ✅ Sin dependencias de negocio
- ✅ Genérico y configurable

**Ejemplos:**
- `BaseDataService` - CRUD genérico
- `BaseAuthService` - Autenticación genérica
- `ErrorHandlingService` - Manejo de errores
- `LoadingService` - Estado de carga
- Interceptores HTTP
- Componentes de layout

#### 🟨 NEGOCIO (Específico)

**Características:**
- ✅ Específico del dominio
- ✅ Contiene reglas de negocio
- ✅ Modelos y servicios de datos
- ✅ Features y componentes de negocio

**Ejemplos:**
- `ClienteDataService` - Extiende `BaseDataService<Cliente>`
- `PedidoDataService` - Lógica específica de pedidos
- `Cliente`, `Pedido`, `Producto` - Modelos del dominio
- Features: `clientes/`, `pedidos/`, `productos/`

### Servicios Base

#### BaseDataService

Servicio abstracto para operaciones CRUD genéricas.

**Ubicación:** `core/services/base/base-data.service.ts`

**Uso:**
```typescript
@Injectable({ providedIn: 'root' })
export class ClienteDataService extends BaseDataService<Cliente> {
  protected entityName = 'cliente';

  // Métodos genéricos heredados:
  // - getAll()
  // - getById()
  // - getAllIncludingDeleted()

  // Métodos específicos del dominio:
  getClientesPorZona(idZona: number): Observable<Cliente[]> {
    return this.getAll({
      filters: [{ field: 'idZona', op: 'eq', value: idZona }]
    });
  }
}
```

**Métodos disponibles:**
- `getAll(options?)` - Lista con filtros, joins, ordenamiento
- `getById(id, options?)` - Obtiene por ID
- `getAllIncludingDeleted(options?)` - Incluye registros desactivados

#### BaseAuthService

Servicio abstracto para autenticación genérica.

**Ubicación:** `core/auth/base/base-auth.service.ts`

**Uso:**
```typescript
@Injectable({ providedIn: 'root' })
export class AuthService extends BaseAuthService {
  protected loginEndpoint = 'auth/login';
  protected apiUrl = environment.apiUrl;

  // Métodos genéricos heredados:
  // - baseLogin()
  // - baseLogout()
  // - isLoggedIn (computed signal)
  // - token (readonly signal)

  // Lógica específica del dominio:
  async login(username: string, password: string): Promise<void> {
    const { payload } = await this.baseLogin(username, password);
    // Lógica específica: selección de zona, redirección, etc.
  }
}
```

### Interceptores HTTP

- **AuthInterceptor** - Agrega token JWT a las peticiones
- **ErrorInterceptor** - Manejo centralizado de errores HTTP
- **LoadingInterceptor** - Gestión del estado de carga global
- **RetryInterceptor** - Reintentos automáticos (configurable)

### Guards

- **authGuard** - Protege rutas que requieren autenticación
- **authMatchGuard** - Verifica autenticación antes de cargar rutas lazy
- **devAdminGuard** - Restringe acceso a herramientas de desarrollo
- **setupGuard** - Controla el flujo de configuración inicial

### Flujo de Datos

#### 1. Request HTTP

```
Component → Domain Service → BaseDataService → DbService (UI-Kit) → API
```

#### 2. Response HTTP

```
API → DbService → BaseDataService → Domain Service → Component
```

#### 3. Manejo de Errores

```
Error → Error Interceptor → ErrorHandlingService → LoggingService → User Notification
```

#### 4. Estado de Carga

```
HTTP Request → Loading Interceptor → LoadingService → Global Loading State
```

### Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    UI-Kit (Externo)                     │
│  - DbService, Componentes, Utilidades, Validators       │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    CORE (Base)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ BaseData     │  │ BaseAuth     │  │ Interceptors  │ │
│  │ Service      │  │ Service      │  │ Services      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
└─────────┼──────────────────┼──────────────────┼─────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼─────────┐
│                    DOMAIN (Negocio)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ ClienteData  │  │ PedidoData   │  │ ProductoData │ │
│  │ Service      │  │ Service      │  │ Service      │ │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘ │
│         │                  │                  │         │
│  ┌──────▼──────────────────▼──────────────────▼───────┐ │
│  │              Models (Interfaces)                    │ │
│  └─────────────────────────────────────────────────────┘ │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                    FEATURES (UI)                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ Clientes     │  │ Pedidos      │  │ Productos    │ │
│  │ Component    │  │ Component    │  │ Component    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologías

### Core

- **Angular 20.1.0** - Framework principal
- **TypeScript 5.8.2** - Tipado estático
- **RxJS 7.8.0** - Programación reactiva
- **Angular Material 20.2.0** - Componentes UI
- **Angular CDK 20.2.0** - Componentes de bajo nivel

### UI-Kit

- **ui-kit** - Biblioteca de componentes y utilidades reutilizables
  - **Componentes**: data-table, confirm-dialog, loading-spinner, etc.
  - **Servicios**: DbService, EncryptionService, etc.
  - **Utilidades**: date, string, validation, time
  - **Validators**: common, password, argentina
  - **Pipes**: currency, phone, truncate, fecha

### Dependencias Adicionales

- **date-fns 4.1.0** - Manipulación de fechas
- **crypto-js 4.2.0** - Encriptación
- **@angular/google-maps 20.2.3** - Integración de mapas
- **@googlemaps/js-api-loader 1.16.10** - Cargador de Google Maps API
- **chart.js 4.4.0** - Gráficos
- **ng2-charts 4.1.1** - Wrapper de Chart.js para Angular
- **ngx-dropzone 3.1.0** - Componente de carga de archivos

### DevDependencies

- **@angular/cli 20.1.4** - CLI de Angular
- **@angular/build 20.1.4** - Build system
- **Karma 6.4.0** - Test runner
- **Jasmine 5.8.0** - Framework de testing

---

## 🔧 Configuración

### Variables de Entorno

Configurar en `src/environments/`:

**environment.ts** (desarrollo local):
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://dev.distribuidoraali.com.ar/api',
  GMapsApiKey: 'AIzaSyDhc9ibqCxO4k9MmABoDypgQN5QKBJXlGA',
  errorNotificationEmail: 'pablo.flores86@gmail.com',
};
```

**environment.dev.ts** (desarrollo):
```typescript
export const environment = {
  production: false,
  apiUrl: 'https://dev.distribuidoraali.com.ar/api',
  // ... otras configuraciones
};
```

**environment.prod.ts** (producción):
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://distribuidoraali.com.ar/api',
  // ... otras configuraciones
};
```

### UI-Kit Configuration

Ver `src/app/app.config.ts` para configuración de UI-Kit (DbService, DateAdapter, etc.)

### Angular Configuration

- **Preserve Symlinks**: Habilitado para desarrollo con npm link
- **CommonJS Dependencies**: `crypto-js` permitido
- **Output Path**: `dist/distali-admin`
- **Budgets**: Configurados para warnings y errores de tamaño

---

## 📝 Convenciones

### Naming

- **Servicios de datos:** `*-data.service.ts` (ej: `cliente-data.service.ts`)
- **Servicios base:** `base-*.service.ts` (ej: `base-data.service.ts`)
- **Modelos:** `*.interface.ts` (ej: `cliente.interface.ts`)
- **Componentes:** `*.component.ts`
- **Validators:** `*.validators.ts`
- **Guards:** `*.guard.ts`
- **Interceptores:** `*.interceptor.ts`

### Imports

- **UI-Kit:** `import { ... } from 'ui-kit'`
- **Core:** `import { ... } from '../../core/...'`
- **Domain:** `import { ... } from '../../domain/...'`
- **Features:** `import { ... } from '../features/...'`

### Estructura de Servicios

```typescript
@Injectable({ providedIn: 'root' })
export class EntityDataService extends BaseDataService<Entity> {
  protected entityName = 'entity';

  // 1. Métodos genéricos heredados (no override a menos que sea necesario)
  // 2. Métodos específicos del dominio
  // 3. Métodos privados/helpers
}
```

### Estructura de Features

Cada feature debe contener:
- Componente principal
- Rutas (si aplica)
- Servicios específicos (si no están en domain)
- Modelos específicos (si no están en domain)

---

## 📞 Soporte

Para reportar problemas, sugerencias o contribuciones, contactar al equipo de desarrollo.

---

**Última actualización:** 2026-01-25

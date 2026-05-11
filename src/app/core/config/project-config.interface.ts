/**
 * Configuración modular del proyecto
 * Permite habilitar/deshabilitar módulos y entidades opcionales
 */

/**
 * Tablas del módulo BASE (siempre activas)
 */
export interface BaseModule {
  enabled: true; // Siempre activo, no se puede desactivar
  tables: {
    Usuario: string;
    Persona: string;
    Rol: string;
    PermisoRol: string;
    Funcionalidad: string;
    audit_log: string;
  };
}

/**
 * Configuración de entidades opcionales
 */
export interface OptionalEntities {
  // Taxonomía (opcional)
  Categoria?: {
    enabled: boolean;
    tableName: string;
    hasSubcategorias: boolean;
  };
  SubCategoria?: {
    enabled: boolean;
    tableName: string;
  };
  Marca?: {
    enabled: boolean;
    tableName: string;
  };

  // Distribución geográfica (opcional)
  Zona?: {
    enabled: boolean;
    tableName: string;
    requireOnLogin?: boolean; // Si requiere selección de zona al login
  };

  // Distribución de personal (opcional)
  Vendedor?: {
    enabled: boolean;
    tableName: string;
    useZonaRelation: boolean; // Si usa VendedorxZona
  };
  Repartidor?: {
    enabled: boolean;
    tableName: string;
    useZonaRelation: boolean; // Si usa RepartidorxZona
  };
}

/**
 * Módulo COMERCIAL
 */
export interface ComercialModule {
  enabled: boolean;
  tables: {
    Producto: string;
    ProductoDerivado: string;
    ProductoStock: string;
    ProductoDerivadoStock: string;
    ProductoNoComercialZona: string;
    Cliente: string;
    ClienteVendedor: string;
    ClienteRepartidor: string;
    Pedido: string;
    DetallePedido: string;
    DetallePedidoLote: string;
    EstadoPedido: string;
    ListaPrecio: string;
    ProductoListaPrecio: string;
    PagoPedido: string;
    Proveedor: string;
    CompromisoProveedor: string;
  };
}

/**
 * Módulo DISTRIBUCI��N
 */
export interface DistribucionModule {
  enabled: boolean;
  tables: {
    Carga: string;
    CargaxZona: string;
    DetalleCarga: string;
    EstadoCarga: string;
    Entrega: string;
    EntregaProducto: string;
    DevolucionEntrega: string;
    DevolucionDetalle: string;
    VisitaCliente: string;
  };
  // Requiere entidades opcionales
  requires?: {
    Zona: boolean;
    Vendedor?: boolean;
    Repartidor?: boolean;
  };
}

/**
 * Módulo FINANZAS
 */
export interface FinanzasModule {
  enabled: boolean;
  tables: {
    EstadoCuentaCorriente: string;
    PagoPersonal: string;
    Rendicion: string;
    RendicionPago: string;
    PagoSaldoManual: string;
    DocumentoRespaldo: string;
  };
}

/**
 * Configuraci?n principal del proyecto
 */
export interface ProjectConfig {
  /** Informaci?n del proyecto */
  name: string;
  version: string;
  /** Default locale for i18n (e.g. 'es', 'en'). Can later be overridden by tenant/user settings. */
  defaultLocale?: string;

  // Módulo BASE (siempre activo)
  base: BaseModule;

  // Entidades opcionales
  optional: OptionalEntities;

  // Módulos funcionales
  modules: {
    comercial?: ComercialModule;
    distribucion?: DistribucionModule;
    finanzas?: FinanzasModule;
  };

  // Configuración de sesión
  session: {
    // Campos opcionales en SessionData
    hasZona: boolean;
    hasVendedor: boolean;
    hasRepartidor: boolean;
  };
}

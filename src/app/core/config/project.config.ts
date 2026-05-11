import { ProjectConfig } from './project-config.interface';

/**
 * Configuración del proyecto actual (DistaliAdmin)
 * 
 * Esta configuración define qué módulos y entidades están habilitados
 * y permite reutilizar la base en otros proyectos simplemente cambiando
 * esta configuración.
 */
export const projectConfig: ProjectConfig = {
  name: 'DistaliAdmin',
  version: '1.0.0',
  defaultLocale: 'es',

  // BASE - Siempre activo
  base: {
    enabled: true,
    tables: {
      Usuario: 'Usuario',
      Persona: 'Persona',
      Rol: 'Rol',
      PermisoRol: 'PermisoRol',
      Funcionalidad: 'Funcionalidad',
      audit_log: 'audit_log',
    },
  },

  // Entidades opcionales - Todas habilitadas en este proyecto
  optional: {
    Categoria: {
      enabled: false,
      tableName: 'Categoria',
      hasSubcategorias: false,
    },
    SubCategoria: {
      enabled: false,
      tableName: 'SubCategoria',
    },
    Marca: {
      enabled: false,
      tableName: 'Marca',
    },
    Zona: {
      enabled: false,
      tableName: 'Zona',
      requireOnLogin: true, // Requiere selección de zona al login
    },
    Vendedor: {
      enabled: false,
      tableName: 'Vendedor',
      useZonaRelation: true, // Usa VendedorxZona
    },
    Repartidor: {
      enabled: false,
      tableName: 'Repartidor',
      useZonaRelation: true, // Usa RepartidorxZona
    },
  },

  // Módulos funcionales - Todos habilitados
  modules: {
    comercial: {
      enabled: false,
      tables: {
        Producto: 'Producto',
        ProductoDerivado: 'ProductoDerivado',
        ProductoStock: 'ProductoStock',
        ProductoDerivadoStock: 'ProductoDerivadoStock',
        ProductoNoComercialZona: 'ProductoNoComercialZona',
        Cliente: 'Cliente',
        ClienteVendedor: 'ClienteVendedor',
        ClienteRepartidor: 'ClienteRepartidor',
        Pedido: 'Pedido',
        DetallePedido: 'DetallePedido',
        DetallePedidoLote: 'DetallePedidoLote',
        EstadoPedido: 'EstadoPedido',
        ListaPrecio: 'ListaPrecio',
        ProductoListaPrecio: 'ProductoListaPrecio',
        PagoPedido: 'PagoPedido',
        Proveedor: 'Proveedor',
        CompromisoProveedor: 'CompromisoProveedor',
      },
    },
    distribucion: {
      enabled: false,
      tables: {
        Carga: 'Carga',
        CargaxZona: 'CargaxZona',
        DetalleCarga: 'DetalleCarga',
        EstadoCarga: 'EstadoCarga',
        Entrega: 'Entrega',
        EntregaProducto: 'EntregaProducto',
        DevolucionEntrega: 'DevolucionEntrega',
        DevolucionDetalle: 'DevolucionDetalle',
        VisitaCliente: 'VisitaCliente',
      },
      requires: {
        Zona: true,
        Vendedor: true,
        Repartidor: true,
      },
    },
    finanzas: {
      enabled: false,
      tables: {
        EstadoCuentaCorriente: 'EstadoCuentaCorriente',
        PagoPersonal: 'PagoPersonal',
        Rendicion: 'Rendicion',
        RendicionPago: 'RendicionPago',
        PagoSaldoManual: 'PagoSaldoManual',
        DocumentoRespaldo: 'DocumentoRespaldo',
      },
    },
  },

  // Configuración de sesión
  session: {
    hasZona: true,
    hasVendedor: true,
    hasRepartidor: true,
  },
};

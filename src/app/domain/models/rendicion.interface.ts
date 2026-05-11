export interface Rendicion {
  idRendicion?: number;
  idUsuario: number;
  fechaRendicion: string;
  observaciones?: string | null;
  esActivo?: number;
  fechaAlta?: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number | null;
}

export interface RendicionPago {
  idRendicionPago?: number;
  idRendicion: number;
  idPagoPedido: number;
  monto: number;
  metodoPago: string;
  numComprobante?: string | null;
  entidad?: string | null;
  fechaRendicion: string;
  esActivo?: number;
  fechaAlta?: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number | null;
}

export interface PagoPendienteRendir {
  idPagoPedido: number;
  idPedido: number;
  monto: number;
  fechaPago: string;
  metodoPago: string;
  numComprobante?: string | null;
  entidad?: string | null;
  clienteNombre?: string;
  numeroPedido?: number;
  idCarga?: number; // Carga asociada al pedido
  idVendedor?: number; // Vendedor asociado al pedido
}






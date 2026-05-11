/**
 * Interfaz para detalles de devolución de productos
 */
export interface DevolucionDetalle {
  idDevolucionDetalle?: number;
  idDevolucionEntrega: number;
  idDetallePedido: number;
  idProducto: number;
  idProductoDerivado: number | null;
  tipoDevolucion: 'BUEN_ESTADO' | 'ROTO' | 'VENCIDO' | 'MERMA';
  cantidad: number;
  observaciones?: string | null;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  esActivo: number;
}


/**
 * Interfaz para devoluciones de productos en entregas
 */
export interface DevolucionEntrega {
  idDevolucionEntrega?: number;
  idPedido: number;
  idCarga: number | null; // ID de la carga asociada (para facilitar procesamiento en distribución)
  idDetallePedido: number;
  idProducto: number;
  idProductoDerivado: number | null; // Null si no es derivado
  cantidad: number;
  motivo: string | null; // Motivo de la devolución
  stockActualizado: number; // 0 = pendiente, 1 = actualizado
  fechaActualizacionStock: string | null; // NULL hasta que se actualice el stock
  idUsuarioAlta?: number; // Opcional - lo maneja el ui-kit automáticamente
  fechaAlta?: string; // Opcional - lo maneja el ui-kit automáticamente
  esActivo: number;
}



/**
 * Vincula un DetallePedido con los lotes de los que se descontó stock.
 * Permite restaurar stock al cancelar o reducir cantidad.
 *
 * Tabla en BD (crear si no existe):
 * CREATE TABLE DetallePedidoLote (
 *   idDetallePedidoLote INT AUTO_INCREMENT PRIMARY KEY,
 *   idDetallePedido INT NOT NULL,
 *   idProductoStock INT NULL,
 *   idProductoDerivadoStock INT NULL,
 *   cantidad DECIMAL(12,2) NOT NULL,
 *   esActivo TINYINT(1) DEFAULT 1,
 *   fechaBaja DATETIME NULL,
 *   idUsuarioBaja INT NULL,
 *   FOREIGN KEY (idDetallePedido) REFERENCES DetallePedido(idDetallePedido),
 *   FOREIGN KEY (idProductoStock) REFERENCES ProductoStock(idProductoStock),
 *   FOREIGN KEY (idProductoDerivadoStock) REFERENCES ProductoDerivadoStock(idProductoDerivadoStock)
 * );
 */
export interface DetallePedidoLote {
  idDetallePedidoLote?: number;
  idDetallePedido: number;
  /** Lote de producto (producto sin derivados) */
  idProductoStock?: number | null;
  /** Lote de derivado (producto con derivados) */
  idProductoDerivadoStock?: number | null;
  cantidad: number;
}

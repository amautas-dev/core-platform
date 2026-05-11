export interface DetallePedido {
  idDetallePedido: number;
  idPedido: number;
  idDetalleCarga?: number;
  idProducto: number;
  idProductoDerivado?: number | null;
  cantidad: number;
  cantidadFinal?: number; // Cantidad entregada (si no se pesa)
  cantidadPesada?: number; // Cantidad pesada (si se pesa)
  precio_unitario: number; // Precio unitario
  precio_unitario_costo?: number;
  cantidadConfirmada?: number;
  necesitaPesar: number; // 1 = necesita pesar, 0 = no necesita pesar
  esPromo?: number;
  esActivo: number;
  fechaAlta: string;
  idUsuarioAlta: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
  // Campos calculados
  subtotal?: number; // Calculado según necesitaPesar
}

export interface DetallePedidoConProducto extends DetallePedido {
  productoNombre?: string;
}


import { DetallePedido } from './detalle-pedido.interface';

/**
 * Interfaz para productos en el contexto de entrega
 */
export interface EntregaProducto extends DetallePedido {
  // Información del producto
  nombreProducto?: string;
  nombreDerivado?: string;
  marca?: string;
  
  // Cantidades para la entrega
  cantidadPedida: number;
  cantidadEntregar: number;
  cantidadDevolver: number;
  cantidadFinal: number; // cantidadPedida - cantidadDevolver (si no se pesa)
  cantidadPesada?: number; // Si necesitaPesar = 1
  
  // Precios
  precioUnitario: number;
  subtotal: number; // Calculado dinámicamente
  
  // Validaciones
  necesitaPesar: number; // 1 = necesita pesar, 0 = no necesita pesar
  tieneError: boolean;
  mensajeError?: string;
}


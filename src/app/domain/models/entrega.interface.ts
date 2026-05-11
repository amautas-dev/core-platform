import { Cliente } from './cliente.interface';
import { Pedido } from './pedido.interface';
import { VendedorDTO } from './vendedor.interface';
import { Zona } from './zona.interface';
import { EntregaProducto } from './entrega-producto.interface';

/**
 * Estados posibles de una entrega
 */
export type EstadoEntrega = 'PENDIENTE' | 'EN_RUTA' | 'ENTREGADO';

/**
 * Interfaz para representar un pedido en el contexto de entregas
 */
export interface EntregaPedido {
  idPedido: number;
  idCarga: number;
  idCliente: number;
  idVendedor: number;
  idZona: number;
  
  // Datos del cliente
  cliente: Cliente;
  nombreCliente: string;
  direccionCliente: string;
  telefonoCliente?: string;
  latitud?: number | null;
  longitud?: number | null;
  
  // Datos del pedido
  totalPedido: number;
  saldoCCActual: number;
  fechaHoraEntrega?: string | null;
  estadoEntrega: EstadoEntrega;
  
  // Datos adicionales
  vendedor: VendedorDTO;
  zona: Zona;
  observaciones?: string;
  
  // Orden de entrega (si fue definido manualmente)
  ordenEntrega?: number;
  
  // Fechas
  fechaAlta: string;
  fechaHoraEntregaReal?: string | null;
  
  // Productos del pedido
  productos: EntregaProducto[];
}

/**
 * Interfaz para el listado de entregas
 */
export interface EntregaTabla {
  idPedido: number;
  idCliente: number;
  numeroPedido: string;
  cliente: string;
  direccion: string;
  telefono?: string;
  vendedor: string;
  zona: string;
  totalPedido: number;
  saldoCCActual: number;
  estadoEntrega: EstadoEntrega;
  tieneUbicacion: boolean;
  latitud?: number | null;
  longitud?: number | null;
  ordenEntrega?: number;
}


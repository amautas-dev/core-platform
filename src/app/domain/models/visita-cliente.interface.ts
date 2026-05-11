/**
 * Interfaz para representar una visita presencial a un cliente
 */
export interface VisitaCliente {
  idVisitaCliente: number;
  idCliente: number;
  idUsuario: number;
  idVendedor?: number | null;
  idPedido?: number | null;
  
  fechaHoraVisita: string;
  
  latitudVisita?: number | null;
  longitudVisita?: number | null;
  distanciaMetros?: number | null;
  
  tomoPedido: boolean;
  motivoVisita?: 'Pedido' | 'Cobranza' | 'Consulta' | 'Seguimiento' | 'Otro' | null;
  
  observaciones?: string | null;
  
  esActivo: boolean;
  fechaAlta: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number | null;
  idUsuarioBaja?: number | null;
}

/**
 * DTO para crear una nueva visita
 */
export interface VisitaClienteForm {
  idCliente: number;
  idUsuario: number;
  idVendedor?: number | null;
  idPedido?: number | null;
  fechaHoraVisita?: string;
  latitudVisita?: number | null;
  longitudVisita?: number | null;
  distanciaMetros?: number | null;
  tomoPedido: boolean;
  motivoVisita?: 'Pedido' | 'Cobranza' | 'Consulta' | 'Seguimiento' | 'Otro' | null;
  observaciones?: string | null;
}

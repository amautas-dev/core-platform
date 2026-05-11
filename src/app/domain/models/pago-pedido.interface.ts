export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque';

export interface PagoPedido {
  idPagoPedido: number;
  idPedido: number;
  monto: number;
  fechaPago: string;
  metodoPago: MetodoPago;
  numComprobante?: string | null; // Unificado: número de cheque si es cheque, número de transferencia si es transferencia, o número de comprobante general
  entidad?: string | null; // Entidad financiera (banco) para transferencias y cheques
  observaciones?: string | null;
  validado?: number; // 1 = validado/acreditado, 0 = pendiente de validar (solo para transferencias y cheques)
  fechaValidacion?: string | null;
  idUsuarioValidacion?: number | null;
  esActivo?: number;
  fechaAlta?: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number | null;
}


export interface PagoPersonal {
  idPagoPersonal?: number;
  idUsuario: number; // Usuario que recibe el pago (vendedor, repartidor, etc.)
  idCarga?: number | null; // Carga asociada (opcional)
  tipoPago: 'Honorario' | 'A Cuenta' | 'Adelanto' | 'Comision' | 'Otro';
  monto: number;
  fechaPago: string;
  observaciones?: string | null;
  estado: 'Pendiente' | 'Aprobado' | 'Pagado' | 'Rechazado';
  fechaAprobacion?: string | null;
  idUsuarioAprobacion?: number | null;
  fechaPagoReal?: string | null;
  idUsuarioPago?: number | null;
  esActivo?: number;
  fechaAlta?: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number | null;
}

export interface PagoPersonalTabla {
  idPagoPersonal: number;
  idUsuario: number;
  nombreUsuario: string;
  tipoPago: string;
  monto: number;
  fechaPago: string;
  observaciones?: string;
  estado: string;
  idCarga?: number;
  numeroCarga?: string;
}


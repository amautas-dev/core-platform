// estado-cuenta-corriente.interface.ts
export interface EstadoCuentaCorriente {
  idEstadoCuentaCorriente: number;
  nombreEstadoCuenta: string;
  descripcion: string | null;
  esActivo: number;      // 1 = activo, 0 = inactivo
  fechaAlta: string;
  fechaBaja: string | null;
  idUsuarioAlta: number;
  idUsuarioBaja: number | null;
}

/*export interface EstadoCuentaCorriente {
  idEstadoCuentaCorriente: number;
  nombreEstadoCuenta: string;
  descripcion?: string;

  // Auditoría
  esActivo: boolean;
  fechaAlta: string;
  idUsuarioAlta?: number;
  fechaBaja?: string;
  idUsuarioBaja?: number;
}

// DTO (opcional, si hacés join con Usuario o Cliente)
export interface EstadoCuentaCorrienteDTO extends EstadoCuentaCorriente {
  // ejemplo de join futuro si lo necesitás
  // idUsuarioAlta?: Usuario;
  // idUsuarioBaja?: Usuario;
}
*/
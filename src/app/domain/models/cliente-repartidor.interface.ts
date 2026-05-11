// cliente-repartidor.interface.ts
export interface ClienteRepartidor {
  idClienteRepartidor: number;
  idCliente: number;
  idRepartidor: number;
  esActivo: number;      // 1 = activo, 0 = inactivo
  fechaAlta: string;
  fechaBaja: string | null;
  idUsuarioAlta: number;
  idUsuarioBaja: number | null;
}


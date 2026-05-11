// cliente-vendedor.interface.ts
export interface ClienteVendedor {
  idClienteVendedor: number;
  idCliente: number;
  idVendedor: number;
  esActivo: number;      // 1 = activo, 0 = inactivo
  fechaAlta: string;
  fechaBaja: string | null;
  idUsuarioAlta: number;
  idUsuarioBaja: number | null;
}

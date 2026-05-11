export interface Proveedor {
  idProveedor?: number;
  nombreProveedor: string;
  direccion?: string | null;
  email?: string | null;
  telefono?: string | null;
  nombreContacto?: string | null;
  esActivo?: boolean | number;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
}


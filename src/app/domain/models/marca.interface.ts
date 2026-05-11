export interface Marca {
  idMarca?: number;
  nombreMarca: string;
  logo?: string | null;
  esActivo?: boolean;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
}

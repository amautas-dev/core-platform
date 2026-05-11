export interface RolDTO {
  idRol: number;
  nombreRol: string;
  porDefecto?: boolean;
  esActivo: number;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
}

export interface RolResumen {
  idRol: number;
  nombreRol: string;
}
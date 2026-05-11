export interface Zona {
  idZona: number;
  numZona: number;
  nombreZona: string;
  esActivo: number;
  fechaAlta: string;
  idUsuarioAlta: number;
  fechaBaja: string | null;
  idUsuarioBaja: number | null;
}

export interface ZonaResumen {
  idZona: number;
  nombreZona: string;
}

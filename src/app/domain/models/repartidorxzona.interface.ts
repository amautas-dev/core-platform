export interface RepartidorxZona {
  idRepartidorxZona: number;
  idRepartidor: number;
  idZona: number;
  esActivo: number;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
}

export interface RepartidorxZonaInsert {
  idRepartidor: number;
  idZona: number;
  esActivo: number;
}

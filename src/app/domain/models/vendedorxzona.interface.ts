export interface VendedorxZona {
  idVendedorxZona: number;
  //idVendedor: number;
  idZona: number;
  esActivo: number;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;

  // JOIN opcional
  idVendedor?: VendedorJoin;
}

export interface VendedorJoin {
  idVendedor?: number;
  idPersona?: PersonaJoin;
}

export interface UsuarioJoin {
  idPersona?: PersonaJoin;
}

export interface PersonaJoin {
  nombre?: string;
  apellido?: string;
}

export interface VendedorxZonaInsert {
  idVendedor: number;
  idZona: number;
  esActivo: number;
}

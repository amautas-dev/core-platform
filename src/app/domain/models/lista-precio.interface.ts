export interface ListaPrecio {
  idListaPrecio: number;
  nombreLista: string;
  esDefault?: 0 | 1;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  esActivo: 0 | 1;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
}

export interface ProductoListaPrecio {
  idProductoListaPrecio: number;
  idProducto: number;
  idListaPrecio: number;
  precio: number | null;
  precioPromo?: number | null;
  stockPromo?: number | null;
  fechaPromoDesde?: string | null;
  fechaActualizaPrecio?: string | null;
  esActivo: 0 | 1;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
}

export interface ZonaListaPrecio {
  idZonaListaPrecio: number;
  idZona: number;
  idListaPrecio: number;
  esActivo: 0 | 1;
}

export interface ProductoTabla {
  id: number;
  nombre: string;
  nombreCorto: string;
  marca: string;
  categoria: string;
  subcategoria: string;
  necesitaPesar: boolean;
  stockTotal: number;
  stockAlerta: number;
  precioCosto: number;
  pesoAproximadoUnidad?: number | null;
  esActivo: boolean;
  esVariante: boolean;
  imagenUrl?: string;
  estado: 'Activo' | 'Inactivo' | 'Sin Stock';
}

export interface ProductoResumen {
  idProducto: number;
  nombreProducto: string;
  nombreCorto?: string | null;
  idMarca?: number | null;
  idCategoria?: number | null;
  idSubCategoria?: number | null;
  stock?: number | null;
  stockAlerta?: number | null;
  precioCosto?: number | null;
  pesoAproximadoUnidad?: number | null;
  esActivo: 0 | 1;
}

export interface Producto {
  idProducto: number;
  nombreProducto: string;
  manejaSoloDerivados?: 0 | 1; // Por defecto 1. Si es 1, maneja derivados. Si es 0, maneja lotes directos.
  stockTotal?: number;
  stockReservado?: number;
}

export interface ProductoDerivado {
  idProductoDerivado: number;
  idProducto: number;
  nombreProductoDerivado: string;
  esActivo: number;
  stockTotal?: number;
  stockReservado?: number;
}

export interface ProductoDerivadoStock {
  idProductoDerivadoStock?: number;
  idProductoDerivado: number;
  cantidad: number;
  fechaVencimiento: string | null; // YYYY-MM-DD
  esActivo?: number;
}

export interface ProductoStock {
  idProductoStock?: number;
  idProducto: number;
  cantidad: number;
  fechaVencimiento: string | null; // YYYY-MM-DD
  esActivo?: number;
}
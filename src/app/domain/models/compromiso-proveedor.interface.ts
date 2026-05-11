export interface CompromisoProveedor {
  idCompromisoProveedor?: number;
  idProveedor: number; // Obligatorio: FK a Proveedor
  montoTotal: number;
  fechaCaducidad: string;
  descripcion?: string | null;
  observaciones?: string | null;
  fotos?: string | null; // JSON array de URLs de fotos
  estado: 'Pendiente' | 'Pagado' | 'Vencido' | 'Cancelado';
  fechaPago?: string | null;
  idUsuarioPago?: number | null;
  esActivo?: number;
  fechaAlta?: string;
  fechaBaja?: string | null;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number | null;
}

export interface CompromisoProveedorTabla {
  idCompromisoProveedor: number;
  idProveedor: number;
  nombreProveedor: string;
  montoTotal: number;
  fechaCaducidad: string;
  descripcion?: string;
  estado: string;
  diasHastaVencimiento?: number;
  fotos?: string[];
}


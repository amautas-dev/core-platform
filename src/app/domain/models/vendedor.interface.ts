import { Usuario, UsuarioDTO } from './_common/usuario.interface';

export interface Vendedor {
  idVendedor: number;
  idUsuario: number;
  idTipoContrato?: number | null;
  porcentajeVenta: number;
  fechaIngreso?: string | null;
  esActivo: boolean;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
  // Nuevos campos para tipos de contrato
  salarioFijoMensual?: number | null;
  porcentajePorObjetivos?: number | null;
  objetivoEstablecido?: number | null;
  porcentajeFijo?: number | null;
}

export interface VendedorDTO
  extends Omit<Vendedor, 'idUsuario' | 'idUsuarioAlta' | 'idUsuarioBaja'> {
  idUsuario: UsuarioDTO;
  idUsuarioAlta?: UsuarioDTO;
  idUsuarioBaja?: UsuarioDTO;
}

// Reducida para select
export interface VendedorResumen {
  id: number;
  nombreCompleto: string;
}

export interface VendedorTabla {
  id: number;
  idUsuario?: number; // ID del usuario asociado al vendedor
  nombreCompleto: string;
  porcentajeVenta: number;
  fechaIngreso?: string;
  estado: 'Activo' | 'Inactivo';
  estadoColor: 'activo' | 'inactivo';

  usuario: string;
  email: string;
  telefono: string;
  dni: string;
  fechaAlta: string | null;
  // Campos para tipos de contrato
  idTipoContrato?: number | null;
  salarioFijoMensual?: number | null;
  porcentajePorObjetivos?: number | null;
  objetivoEstablecido?: number | null;
  porcentajeFijo?: number | null;
}

export interface VendedorForm {
  idUsuario?: number; // Opcional para actualizaciones (no se puede cambiar el usuario de un vendedor existente)
  idTipoContrato: number;
  porcentajeVenta: number;
  fechaIngreso: string;
  // Nuevos campos para tipos de contrato
  salarioFijoMensual?: number | null;
  porcentajePorObjetivos?: number | null;
  objetivoEstablecido?: number | null;
  porcentajeFijo?: number | null;
}

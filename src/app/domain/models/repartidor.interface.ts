import { Usuario, UsuarioDTO } from './_common/usuario.interface';

export interface Repartidor {
  idRepartidor: number;
  idUsuario: number;
  fechaIngreso?: string | null;
  salarioMensual?: number | null;
  esActivo: boolean;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
}

export interface RepartidorDTO
  extends Omit<Repartidor, 'idUsuario' | 'idUsuarioAlta' | 'idUsuarioBaja'> {
  idUsuario: UsuarioDTO;
  idUsuarioAlta?: UsuarioDTO;
  idUsuarioBaja?: UsuarioDTO;
}

export interface RepartidorResumen {
  id: number;
  nombreCompleto: string;
}

export interface RepartidorTabla {
  id: number;
  idUsuario: number;
  nombreCompleto: string;
  fechaIngreso?: string;
  salarioMensual?: number | null;
  estado: 'Activo' | 'Inactivo';
  estadoColor: 'activo' | 'inactivo';

  usuario: string;
  email: string;
  telefono: string;
  dni: string;
  fechaAlta: string | null;
}

export interface RepartidorForm {
  idUsuario: number;
  fechaIngreso: string;
  salarioMensual?: number | null;
}

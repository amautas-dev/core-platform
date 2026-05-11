import { Persona } from './persona.interface';
import { RolResumen } from './rol.interface';

export interface Usuario {
  idUsuario: number;
  idPersona: number;
  usuario: string;
  clave: string;
  esActivo?: boolean;
  fechaAlta?: string;
  fechaBaja?: string;
  idUsuarioAlta?: number | Usuario;
  idUsuarioBaja?: number | Usuario;
  idRol: number;
}

export interface UsuarioDTO extends Omit<Usuario, 'idPersona' | 'idRol'> {
  idPersona: Persona;
  rol: RolResumen;
}

export interface UsuarioForm {
  persona: Partial<Persona>;
  usuario: string;
  clave: string;
  idRol: number;
  rol: Partial<RolResumen>; // idRol[]
}

export interface UsuarioResumen {
  id: number;
  usuario: string;
  nombreCompleto?: string;
}

export interface UsuarioView {
  idUsuario: number;
  usuario: string;
  nombreCompleto: string;
  email: string;
  rol: string;
  esActivo: boolean;
}

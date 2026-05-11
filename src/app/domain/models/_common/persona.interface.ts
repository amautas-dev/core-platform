export interface Persona {
  idPersona: number;
  nombre: string;
  apellido: string;
  email?: string;
  telefono?: string;
  direccion?: string;
  imagenPerfil?: string;
  fechaNacimiento?: string | null;
  genero?: string;
  fechaAlta?: string;
  esActivo?: boolean;
  fechaBaja?: string;
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
}

// DTO (si viniera en otra entidad)
export type PersonaDTO = Persona;

// Reducida para combos, etiquetas, etc.
export interface PersonaResumen {
  id: number;
  nombreCompleto: string;
}

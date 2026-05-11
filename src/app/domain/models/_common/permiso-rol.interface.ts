import { Funcionalidad } from './funcionalidad.interface';

export interface PermisoRol {
  idPermisoRol: number;
  idRol: number;
  idFuncionalidad: number | Funcionalidad; // <- join puede venir expandido
  puedeVer: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
  esActivo: boolean;
}
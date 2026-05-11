export interface Funcionalidad {
  idFuncionalidad: number;
  nombre: string;
  icono: string;
  path: string;
  orden: number;
  idPadre?: number | null;
  children?: Funcionalidad[]; // <- útil si tenés jerarquías
  esActivo?: number;
}
export interface Carga {
  idCarga?: number;
  idEncargado?: number;
  idEstadoCarga?: number;
  esActivo?: boolean;
  fechaAlta?: string;
  fechaBaja?: string | null;
  encargado?: { nombre: string };
  estado?: { nombreEstado: string };
  zonas?: string[]; // resumen de zonas asociadas
}

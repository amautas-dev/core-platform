// shared/model/subcategoria.interface.ts
export interface SubCategoria {
  idSubCategoria?: number;
  nombreSubCategoria: string;
  ordenSubCategoria?: number | null;
  nota?: string | null;
  imagenSubCategoria?: string | null;
  idCategoria: number;
  esActivo?: boolean;
  categoria?: { nombreCategoria: string }; // si viene por join
}

export interface Categoria {
  idCategoria?: number;
  nombreCategoria: string;
  imagenCategoria?: string | null;
  ordenCategoria?: number | null;
  nota?: string | null;
  esActivo?: boolean;
  fechaAlta?: string;
  idUsuarioAlta?: number;
  fechaBaja?: string | null;
  idUsuarioBaja?: number | null;
}

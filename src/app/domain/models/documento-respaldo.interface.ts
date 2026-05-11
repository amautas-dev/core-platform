/**
 * Interfaz genérica para documentos de respaldo
 * Puede usarse para cualquier entidad que necesite adjuntar documentos
 */
export interface DocumentoRespaldo {
  idDocumentoRespaldo?: number;
  tipoEntidad: string; // Ej: 'Carga', 'DevolucionEntrega', etc.
  idEntidad: number; // ID de la entidad relacionada
  nombreArchivo: string;
  rutaArchivo: string;
  urlArchivo?: string; // URL completa para acceso
  tipoArchivo?: string; // MIME type
  tamanioArchivo?: number; // Tamaño en bytes
  fechaAlta?: string;
  idUsuarioAlta?: number;
  esActivo: number;
}


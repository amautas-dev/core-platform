import { Zona } from './zona.interface';
import { EstadoCuentaCorriente } from './estado-cuenta-corriente.interface';

// Interfaz base
export interface Cliente {
  idCliente: number;
  idZona: number;
  idEstadoCuentaCorriente?: number;

  nombre: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  orden?: number;
  //idVendedor: number;
  usaCuentaCorriente: boolean;
  usaPrecioCosto: boolean;
  latitud: number | null;
  longitud: number | null;
  diasParaMora: number;

  esActivo: boolean;
  fechaAlta: string;
  fechaBaja?: string;
  fechaHoraUltimaVisita?: string | null; // Fecha y hora de la última visita (con o sin pedido)
  idUsuarioAlta?: number;
  idUsuarioBaja?: number;
  observaciones?: string;
  permitidoEditar?: number; // 1 = permitido, 0 = no permitido (solo admin puede editar)
}

// DTO: con joins expandidos
export interface ClienteDTO
  extends Omit<Cliente, 'idZona' | 'idEstadoCuentaCorriente'> {
  idZona: Zona; // Join expandido
  idEstadoCuentaCorriente?: EstadoCuentaCorriente;
}

// Reducida: para listas o selects
export interface ClienteResumen {
  id: number;
  nombre: string;
}

export interface ClienteTabla {
  id: number;
  idEstadoCuentaCorriente: number;
  nombre: string;
  direccion: string;
  telefono: string;
  zona: string;
  idZona: number;
  esActivo: number;
  estadoColor: 'activo' | 'inactivo';
  vendedor: string;
  orden: number;

  // Nuevos:
  usaCuentaCorriente: boolean;
  usaPrecioCosto: boolean;
  latitud: number | null;
  longitud: number | null;
  diasParaMora: number;
  saldoTotal?: number; // Saldo total de cuenta corriente
  diasDeMora?: number; // Días de mora reales (basado en pedido más antiguo)
  diasDesdeUltimoPedido?: number; // Días desde el último pedido hasta la fecha actual
  diasDesdeUltimaVisita?: number; // Días desde la última visita (con o sin pedido)
  fechaHoraUltimaVisita?: string | null; // Fecha y hora de la última visita
  permitidoEditar?: number; // 1 = permitido, 0 = no permitido (solo admin puede editar)

  cuentaCorriente?: {
    saldoActual: number;
    movimientos: MovimientoCuentaCorriente[];
  };
}

export interface ClienteOrdenUpdate {
  id: number;
  orden: number;
  idZona: number;
}

// cliente-form.interface.ts
export interface ClienteForm {
  nombre: string;
  direccion?: string;
  telefono?: string;
  observaciones?: string;

  idZona: number;
  //idVendedor: number;

  usaCuentaCorriente: boolean;
  usaPrecioCosto: boolean;

  latitud: number | null;
  longitud: number | null;
  diasParaMora: number;
}

export interface MovimientoCuentaCorriente {
  idCliente: number;
  idReferencia: number;
  fecha: string | null;
  descripcion: string;
  tipo: 'Credito' | 'Debito';
  monto: number;
}

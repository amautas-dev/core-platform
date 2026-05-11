import { EstadoPedido } from './estado-pedido.interface';
import { Zona } from './zona.interface';
import { VendedorDTO } from './vendedor.interface';
import { Cliente, ClienteDTO } from './cliente.interface';

export interface Pedido {
  idPedido: number;
  idEstadoPedido: number;
  idCliente: number;
  idVendedor: number;
  idZona: number;
  observaciones?: string;
  esActivo: boolean;
  fechaHoraEntrega?: string | null;
  fechaAlta: string;
  fechaBaja?: string;
  idUsuarioAlta: number;
  idUsuarioBaja?: number;
}

export interface PedidoTabla {
  id: number;
  cliente: string;
  zona: string;
  vendedor: string;
  total: number;
  estado: string;
  creacion: string;
  entrega: string;
  cuenta: string;
  saldo: number;
  idEstadoPedido: number;
  idUsuarioAlta: number;
  idVendedor?: number | null;
}

export interface PedidoDTO
  extends Omit<
    Pedido,
    'idVendedor' | 'idEstadoPedido' | 'idZona' | 'idCliente'
  > {
  idVendedor: VendedorDTO;
  idEstadoPedido: EstadoPedido;
  idZona: Zona;
  idCliente: ClienteDTO;
  total?: number;
}

// Versión reducida para listado o select
export interface PedidoResumen {
  id: number;
  cliente: string;
  zona: string;
  vendedor: string;
  total: number;
  estado: string;
  creacion: string;
  entrega: string;
  cuenta?: string;
}

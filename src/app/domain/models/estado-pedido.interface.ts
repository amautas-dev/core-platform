export interface EstadoPedido {
  idEstadoPedido: number;
  nombreEstadoPedido: string;
  esActivo: number;
  fechaAlta: string;
  idUsuarioAlta: number;
  fechaBaja: string | null;
  idUsuarioBaja: number | null;
}

export interface EstadoPedidoResumen {
  idEstadoPedido: number;
  nombreEstadoPedido: string;
}

export interface EstadoPedidoDTO {
  nombreEstadoPedido: string;
  esActivo?: number;
}

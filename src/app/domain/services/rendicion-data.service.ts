import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { PagoPendienteRendir } from '../models/rendicion.interface';
import { SessionDataService } from '../../core/services/session-data.service';

@Injectable({ providedIn: 'root' })
export class RendicionDataService {
  private db = inject(DbService);
  private session = inject(SessionDataService);

  /**
   * Obtiene los pagos pendientes de rendir y las cargas asociadas.
   * UNA SOLA consulta con joins - SIN ciclos en memoria.
   * 
   * @param periodo Opcional. Si se proporciona, filtra por fechaPago dentro del período
   */
  getPagosYCargasPendientes(periodo?: { fechaInicio: string; fechaFin: string }): Observable<{
    pagos: PagoPendienteRendir[];
    cargas: Array<{ idCarga: number; fechaAlta?: string; estado?: string }>;
    totalAPagar: number;
  }> {
    const idUsuario = this.session.idUsuario;

    if (!idUsuario) {
      return of({ pagos: [], cargas: [], totalAPagar: 0 });
    }

    // Construir filtros - la BD hace el trabajo
    const filters: any[] = [
      { field: 'idUsuarioAlta', op: 'eq', value: idUsuario },
      { field: 'esActivo', op: 'eq', value: 1 },
    ];

    if (periodo) {
      filters.push(
        { field: 'fechaPago', op: 'ge', value: periodo.fechaInicio },
        { field: 'fechaPago', op: 'le', value: periodo.fechaFin }
      );
    }

    // UNA consulta con joins - la BD filtra y agrupa
    return this.db.listFull<any>('PagoPedido', {
      filters,
      joins: [
        'RendicionPago',
        'Pedido.PedidoxCarga.Carga.EstadoCarga',
        'Pedido.Cliente',
        'Pedido.Vendedor'
      ],
      orderBy: [{ field: 'fechaPago', dir: 'desc' }],
    }).pipe(
      map((pagos: any[]) => {
        // Procesamiento mínimo: solo mapeo directo, sin filtros ni reducciones complejas
        const pagosMapeados: PagoPendienteRendir[] = [];
        const cargasMap = new Map<number, { idCarga: number; fechaAlta?: string; estado?: string }>();
        let totalAPagar = 0;

        // UN SOLO ciclo para todo
        for (const pago of pagos) {
          // Calcular monto rendido (solo si hay rendiciones)
          let montoRendido = 0;
          if (Array.isArray(pago.RendicionPago)) {
            for (const rp of pago.RendicionPago) {
              if (rp.esActivo === 1) {
                montoRendido += Number(rp.monto) || 0;
              }
            }
          }

          const montoPago = Number(pago.monto) || 0;
          
          // Solo procesar si hay pendiente
          if (montoPago > montoRendido) {
            const pedido = pago.idPedido && typeof pago.idPedido === 'object' ? pago.idPedido : {};
            const idPedido = typeof pago.idPedido === 'number' ? pago.idPedido : (pedido.idPedido || 0);
            const pedidoObj = typeof pedido === 'object' ? pedido : {};
            // Extraer cliente (puede venir como idCliente (número) o Cliente (objeto) después del join)
            const clienteRaw = pedidoObj.idCliente || (pedidoObj as any).Cliente || {};
            const cliente = typeof clienteRaw === 'object' ? clienteRaw : {};
            const clienteNombre = cliente.nombre || '[Sin cliente]';
            
            // Extraer carga (solo la primera activa)
            let idCarga: number | undefined;
            const pedidoxCarga = pedido.PedidoxCarga || [];
            if (Array.isArray(pedidoxCarga) && pedidoxCarga.length > 0) {
              for (const pxc of pedidoxCarga) {
                if (pxc.esActivo === 1 && pxc.idCarga) {
                  const carga = pxc.idCarga;
                  idCarga = typeof carga === 'number' ? carga : carga?.idCarga;
                  
                  // Agregar a cargasMap solo si no existe
                  if (idCarga && !cargasMap.has(idCarga)) {
                    const estadoCarga = carga?.idEstadoCarga;
                    cargasMap.set(idCarga, {
                      idCarga,
                      fechaAlta: carga?.fechaAlta,
                      estado: estadoCarga && typeof estadoCarga === 'object' ? estadoCarga.nombreEstadoCarga : undefined,
                    });
                  }
                  break; // Solo la primera carga activa
                }
              }
            }
            
            // Extraer vendedor
            const vendedor = pedido.Vendedor || {};
            const idVendedor = typeof vendedor === 'number' ? vendedor : vendedor?.idVendedor;
            
            // Agregar pago
            pagosMapeados.push({
              idPagoPedido: pago.idPagoPedido,
              idPedido,
              monto: montoPago,
              fechaPago: pago.fechaPago,
              metodoPago: pago.metodoPago,
              numComprobante: pago.numComprobante,
              entidad: pago.entidad,
              clienteNombre,
              numeroPedido: idPedido,
              idCarga,
              idVendedor,
            });
            
            totalAPagar += montoPago;
          }
        }

        // Ordenar cargas
        const cargas = Array.from(cargasMap.values()).sort((a, b) => a.idCarga - b.idCarga);

        return {
          pagos: pagosMapeados,
          cargas,
          totalAPagar,
        };
      })
    );
  }

  /**
   * Obtiene las cargas que tienen pagos pendientes de rendir para el usuario logueado.
   */
  getCargasConPagosPendientes(): Observable<number[]> {
    return this.getPagosYCargasPendientes().pipe(
      map((result) => result.cargas.map((c) => c.idCarga))
    );
  }

  /**
   * Obtiene los pagos pendientes de rendir para el usuario logueado.
   * 
   * @param idCarga Opcional. Si se proporciona, filtra solo los pagos de pedidos de esa carga
   * @param periodo Opcional. Si se proporciona, filtra por fechaPago dentro del período
   */
  getPagosPendientesRendir(idCarga?: number, periodo?: { fechaInicio: string; fechaFin: string }): Observable<{
    pagos: PagoPendienteRendir[];
    totalAPagar: number;
  }> {
    return this.getPagosYCargasPendientes(periodo).pipe(
      map((result) => {
        // Si hay filtro por carga, filtrar pagos
        let pagosFiltrados = result.pagos;
        if (idCarga) {
          pagosFiltrados = result.pagos.filter((p) => p.idCarga === idCarga);
        }

        const totalAPagar = pagosFiltrados.reduce((sum, p) => sum + p.monto, 0);

        return {
          pagos: pagosFiltrados,
          totalAPagar,
        };
      })
    );
  }
}






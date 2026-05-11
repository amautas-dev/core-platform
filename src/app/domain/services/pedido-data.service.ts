import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { forkJoin, map, Observable } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { EstadoPedidoResumen } from '../../domain/models/estado-pedido.interface';
import { VendedorDTO } from '../../domain/models/vendedor.interface';
import { Pedido, PedidoDTO } from '../../domain/models/pedido.interface';
import { PagoPedido } from '../../domain/models/pago-pedido.interface';

@Injectable({ providedIn: 'root' })
export class PedidoDataService extends BaseDataService<Pedido> {
  protected entityName = 'Pedido';
  protected override db = inject(DbService);

  getEstadosPedido(): Observable<EstadoPedidoResumen[]> {
    return this.db.list<EstadoPedidoResumen>('EstadoPedido', {
      select: ['idEstadoPedido', 'nombreEstadoPedido'],
      orderBy: [{ field: 'idEstadoPedido', dir: 'asc' }],
    });
  }

  getVendedores(): Observable<VendedorDTO[]> {
    return this.db.list<VendedorDTO>('Vendedor', {
      joins: ['Usuario,Persona'],
      orderBy: [{ field: 'idVendedor' }],
    });
  }
  getPedidos(filters?: { idVendedor?: number; idZona?: number; idEstadosPedido?: number[]; esActivo?: boolean | number }): Observable<PedidoDTO[]> {
    console.log('🔵 [PedidoService] getPedidos llamado con filtros:', JSON.stringify(filters, null, 2));
    
    // Si hay múltiples estados, hacer consultas separadas y combinarlas
    if (filters?.idEstadosPedido && filters.idEstadosPedido.length > 1) {
      const estadosPedido = filters.idEstadosPedido; // Guardar referencia para TypeScript
      console.log(`🔵 [PedidoService] Múltiples estados detectados: [${estadosPedido.join(', ')}] - Haciendo ${estadosPedido.length} consultas separadas`);
      const consultas = estadosPedido.map((estado, idx) => {
        console.log(`🔵 [PedidoService] Preparando consulta ${idx + 1}/${estadosPedido.length} para estado ${estado}`);
        return this.getPedidos({
          ...filters,
          idEstadosPedido: [estado] // Una consulta por estado
        });
      });
      
      return forkJoin(consultas).pipe(
        map(resultados => {
          console.log(`🔵 [PedidoService] Resultados de ${consultas.length} consultas:`, resultados.map(r => r.length));
          // Combinar todos los resultados y eliminar duplicados
          const pedidosMap = new Map<number, PedidoDTO>();
          resultados.forEach((pedidos, idx) => {
            console.log(`🔵 [PedidoService] Consulta ${idx + 1} devolvió ${pedidos.length} pedidos`);
            pedidos.forEach(p => {
              if (!pedidosMap.has(p.idPedido)) {
                pedidosMap.set(p.idPedido, p);
              }
            });
          });
          const resultadoFinal = Array.from(pedidosMap.values());
          console.log(`🔵 [PedidoService] Total combinado: ${resultadoFinal.length} pedidos únicos`);
          return resultadoFinal;
        })
      );
    }

    // Para un solo estado o sin filtro de estado, consulta normal
    const dbFilters: any[] = [];
    
    if (filters?.idVendedor) {
      dbFilters.push({ field: 'idVendedor', op: 'eq', value: filters.idVendedor });
    }
    
    if (filters?.idZona) {
      dbFilters.push({ field: 'idZona', op: 'eq', value: filters.idZona });
    }

    // Filtrar por estado (solo si hay uno)
    if (filters?.idEstadosPedido && filters.idEstadosPedido.length === 1) {
      dbFilters.push({ field: 'idEstadoPedido', op: 'eq', value: filters.idEstadosPedido[0] });
    }

    // Filtrar por esActivo
    if (filters?.esActivo !== undefined) {
      const esActivoValue = filters.esActivo === true ? 1 : filters.esActivo === false ? 0 : filters.esActivo;
      dbFilters.push({ field: 'esActivo', op: 'eq', value: esActivoValue });
    }

    console.log(`🔵 [PedidoService] Filtros DB construidos:`, JSON.stringify(dbFilters, null, 2));
    console.log(`🔵 [PedidoService] Llamando a db.list('Pedido') con ${dbFilters.length} filtros`);

    const pedidosObs = this.db.list<PedidoDTO>('Pedido', {
      joins: [
        'EstadoPedido',
        'Zona',
        'Cliente.EstadoCuentaCorriente',
        'Vendedor.Usuario.Persona',
      ],
      filters: dbFilters.length > 0 ? dbFilters : undefined,
      orderBy: [{ field: 'idPedido', dir: 'desc' }],
    });

    return forkJoin({
      pedidos: pedidosObs.pipe(
        map(pedidos => {
          console.log(`🔵 [PedidoService] db.list devolvió ${pedidos.length} pedidos RAW`);
          if (pedidos.length > 0) {
            console.log(`🔵 [PedidoService] Primeros 3 pedidos RAW:`, pedidos.slice(0, 3).map(p => ({
              idPedido: p.idPedido,
              idEstadoPedido: typeof p.idEstadoPedido === 'object' ? p.idEstadoPedido?.idEstadoPedido : p.idEstadoPedido,
              idZona: typeof p.idZona === 'object' ? p.idZona?.idZona : p.idZona,
              esActivo: p.esActivo
            })));
          }
          return pedidos;
        })
      ),
      totales: this.db.listFull<{ idPedido: number; total: number }>(
        'PedidoTotalView'
      ),
      pagos: this.db.listFull<PagoPedido>('PagoPedido', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
    }).pipe(
      map(({ pedidos, totales, pagos }) => {
        console.log(`🔵 [PedidoService] Procesando resultados: ${pedidos.length} pedidos, ${totales.length} totales, ${pagos.length} pagos`);
        const totalMap = new Map(totales.map((t) => [t.idPedido, t.total]));
        const pagosMap = new Map<number, PagoPedido[]>();
        
        // Agrupar pagos por pedido
        pagos.forEach((p) => {
          if (!pagosMap.has(p.idPedido)) {
            pagosMap.set(p.idPedido, []);
          }
          pagosMap.get(p.idPedido)!.push(p);
        });
        
        return pedidos.map((p) => {
          const total = totalMap.get(p.idPedido) ?? 0;
          const pagosPedido = pagosMap.get(p.idPedido) || [];
          const montoPagado = pagosPedido.reduce((sum, pago) => {
            return sum + (Number(pago.monto) || 0);
          }, 0);
          const saldo = total - montoPagado;
          
          return {
            ...p,
            total,
            saldo,
          };
        });
      })
    );
  }
}

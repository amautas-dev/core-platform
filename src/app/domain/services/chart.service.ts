import { Injectable, inject } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { DbService } from 'ui-kit';
import { Observable, forkJoin, map, switchMap } from 'rxjs';
import { PedidoDataService } from './pedido-data.service';
import { ZonaDataService } from './zona-data.service';
import { PagoPedido } from '../models/pago-pedido.interface';
import { DetallePedido } from '../models/detalle-pedido.interface';
import { RendicionDataService } from './rendicion-data.service';
import { ClienteDataService } from './cliente-data.service';
import { VendedorDataService } from './vendedor-data.service';

interface Periodo {
  fechaInicio: string;
  fechaFin: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChartService {
  private db = inject(DbService);
  private pedidoService = inject(PedidoDataService);
  private zonaService = inject(ZonaDataService);
  private rendicionService = inject(RendicionDataService);
  private clienteService = inject(ClienteDataService);
  private vendedorService = inject(VendedorDataService);

  getFacturacionPorZona(periodo?: Periodo): Observable<ChartConfiguration<'bar'>> {
    const filters: any[] = [{ field: 'esActivo', op: 'eq', value: 1 }];
    
    if (periodo) {
      filters.push(
        { field: 'fechaAlta', op: 'gte', value: periodo.fechaInicio },
        { field: 'fechaAlta', op: 'lte', value: periodo.fechaFin }
      );
    }

    // UNA SOLA consulta: Pedido con join a Zona y PedidoTotalView
    return this.db.listFull<any>('Pedido', {
      joins: ['Zona'],
      filters,
    }).pipe(
      switchMap((pedidos) => {
        // Obtener solo los totales de los pedidos que tenemos
        const pedidosIds = pedidos.map((p: any) => p.idPedido).filter((id: any) => id);
        if (pedidosIds.length === 0) {
          return this.zonaService.getZonas().pipe(
            map((zonas) => ({ zonas, facturacionPorZona: new Map<number, number>() }))
          );
        }
        
        return forkJoin({
          zonas: this.zonaService.getZonas(),
          totales: this.db.listFull<{ idPedido: number; total: number }>('PedidoTotalView', {
            filters: [{ field: 'idPedido', op: 'in', value: pedidosIds }],
          }),
        }).pipe(
          map(({ zonas, totales }) => {
            const totalMap = new Map(totales.map(t => [t.idPedido, t.total]));
            const facturacionPorZona = new Map<number, number>();
            
            pedidos.forEach((pedido: any) => {
              const idZona = typeof pedido.idZona === 'object' ? pedido.idZona?.idZona : pedido.idZona;
              const total = totalMap.get(pedido.idPedido) || 0;
              if (idZona) {
                const actual = facturacionPorZona.get(idZona) || 0;
                facturacionPorZona.set(idZona, actual + total);
              }
            });
            
            return { zonas, facturacionPorZona };
          })
        );
      }),
      map(({ zonas, facturacionPorZona }) => {
        const zonasOrdenadas = zonas.sort((a, b) => (a.numZona || 0) - (b.numZona || 0));
        const labels = zonasOrdenadas.map(z => z.nombreZona);
        const data = zonasOrdenadas.map(z => facturacionPorZona.get(z.idZona) || 0);
        
        return {
          type: 'bar' as const,
          data: {
            labels,
            datasets: [
              {
                label: 'Facturación ($)',
                data,
                backgroundColor: '#42A5F5'
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: true,
                position: 'top',
              },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: (context: any) => `$${context.parsed.x.toLocaleString('es-AR')}`
                }
              }
            },
            scales: {
              x: {
                beginAtZero: true,
                ticks: {
                  callback: (value: any) => `$${value.toLocaleString('es-AR')}`
                }
              }
            }
          }
        };
      })
    );
  }

  getTopProductos(periodo?: Periodo): Observable<ChartConfiguration<'bar'>> {
    // Primero obtener pedidos del período (si hay período)
    const pedidoFilters: any[] = [{ field: 'esActivo', op: 'eq', value: 1 }];
    if (periodo) {
      pedidoFilters.push(
        { field: 'fechaAlta', op: 'gte', value: periodo.fechaInicio },
        { field: 'fechaAlta', op: 'lte', value: periodo.fechaFin }
      );
    }

    // Si hay período, primero obtener pedidos, luego detalles de esos pedidos
    if (periodo) {
      return this.db.list<any>('Pedido', {
        filters: pedidoFilters,
        select: ['idPedido'],
      }).pipe(
        switchMap((pedidos) => {
          const pedidosIds = pedidos.map((p: any) => p.idPedido).filter((id: any) => id);
          if (pedidosIds.length === 0) {
            return this.getTopProductosVacio();
          }
          
          // Solo obtener detalles de esos pedidos
          return this.db.listFull<DetallePedido>('DetallePedido', {
            joins: ['Producto'],
            filters: [
              { field: 'esActivo', op: 'eq', value: 1 },
              { field: 'idPedido', op: 'in', value: pedidosIds }
            ],
          }).pipe(
            map((detalles) => this.procesarTopProductos(detalles))
          );
        })
      );
    }

    // Sin período: obtener todos los detalles activos
    return this.db.listFull<DetallePedido>('DetallePedido', {
      joins: ['Producto'],
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
    }).pipe(
      map((detalles) => this.procesarTopProductos(detalles))
    );
  }

  private getTopProductosVacio(): Observable<ChartConfiguration<'bar'>> {
    return new Observable(observer => {
      observer.next({
        type: 'bar' as const,
        data: {
          labels: ['Sin datos'],
          datasets: [{ label: 'Ventas', data: [0], backgroundColor: '#66BB6A' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
      observer.complete();
    });
  }

  private procesarTopProductos(detalles: any[]): ChartConfiguration<'bar'> {
    if (detalles.length === 0) {
      return {
        type: 'bar' as const,
        data: {
          labels: ['Sin datos'],
          datasets: [{ label: 'Ventas', data: [0], backgroundColor: '#66BB6A' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      };
    }

    // Agrupar por producto sumando cantidadFinal
    const productosMap = new Map<number, { nombre: string; cantidad: number }>();

    detalles.forEach((detalle: any) => {
      const idProducto = typeof detalle.idProducto === 'object' 
        ? (detalle.idProducto as any)?.idProducto 
        : detalle.idProducto;
      
      const cantidad = Number(detalle.cantidadFinal || detalle.cantidad || 0);
      const producto = typeof detalle.idProducto === 'object' ? (detalle.idProducto as any) : null;
      const nombre = producto?.nombreProducto || `Producto ${idProducto}`;

      if (idProducto && cantidad > 0) {
        const actual = productosMap.get(idProducto) || { nombre, cantidad: 0 };
        productosMap.set(idProducto, {
          nombre: actual.nombre,
          cantidad: actual.cantidad + cantidad,
        });
      }
    });

    // Ordenar por cantidad y tomar top 5
    const topProductos = Array.from(productosMap.values())
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    const labels = topProductos.map(p => p.nombre);
    const data = topProductos.map(p => p.cantidad);

    return {
      type: 'bar' as const,
      data: {
        labels: labels.length > 0 ? labels : ['Sin datos'],
        datasets: [
          {
            label: 'Ventas',
            data: data.length > 0 ? data : [0],
            backgroundColor: '#66BB6A'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false
      }
    };
  }

  // TODO: Implementar con datos reales agrupados por fecha
  getTendenciaVentasGanancias(): ChartConfiguration<'line'> {
    return {
      type: 'line',
      data: {
        labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
        datasets: [
          {
            label: 'Ventas',
            data: [10000, 12000, 9000, 14000, 13000, 15000],
            borderColor: '#42A5F5',
            backgroundColor: 'rgba(66,165,245,0.3)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Ganancias',
            data: [8000, 11000, 7000, 12000, 11000, 13000],
            borderColor: '#66BB6A',
            backgroundColor: 'rgba(102,187,106,0.3)',
            fill: true,
            tension: 0.4
          }
        ]
      },
      options: {
        responsive: true
      }
    };
  }

  // TODO: Implementar cálculo de comisiones (porcentajeVenta * total pedidos)
  getComisionesPorVendedorZona(): ChartConfiguration<'bar'> {
    return {
      type: 'bar',
      data: {
        labels: ['Vendedor A', 'Vendedor B', 'Vendedor C', 'Vendedor D'],
        datasets: [
          {
            label: 'Comisiones ($)',
            data: [3000, 1500, 2000, 2500],
            backgroundColor: '#FFA726'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true
      }
    };
  }

  getDistribucionMetodoPago(periodo?: Periodo): Observable<ChartConfiguration<'pie'>> {
    const filters: any[] = [{ field: 'esActivo', op: 'eq', value: 1 }];
    
    if (periodo) {
      filters.push(
        { field: 'fechaPago', op: 'gte', value: periodo.fechaInicio },
        { field: 'fechaPago', op: 'lte', value: periodo.fechaFin }
      );
    }

    return this.db.listFull<PagoPedido>('PagoPedido', {
      filters,
    }).pipe(
      map((pagos) => {
        // Agrupar por método de pago
        const porMetodo = new Map<string, number>();
        
        pagos.forEach(pago => {
          const metodo = (pago.metodoPago || '').toLowerCase();
          const monto = Number(pago.monto) || 0;
          
          if (metodo.includes('efectivo')) {
            porMetodo.set('Efectivo', (porMetodo.get('Efectivo') || 0) + monto);
          } else if (metodo.includes('transferencia')) {
            porMetodo.set('Transferencia', (porMetodo.get('Transferencia') || 0) + monto);
          } else if (metodo.includes('cheque')) {
            porMetodo.set('Cheque', (porMetodo.get('Cheque') || 0) + monto);
          } else {
            // Otros métodos
            porMetodo.set('Otros', (porMetodo.get('Otros') || 0) + monto);
          }
        });
        
        const labels = Array.from(porMetodo.keys());
        const data = Array.from(porMetodo.values());
        const colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC'];
        
        return {
          type: 'pie' as const,
          data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [
              {
                data: data.length > 0 ? data : [1],
                backgroundColor: colors.slice(0, labels.length || 1)
              }
            ]
          },
          options: {
            responsive: true
          }
        };
      })
    );
  }

  getMontosMoraZona(periodo?: Periodo): Observable<ChartConfiguration<'bar'>> {
    // UNA consulta: Clientes con join a Zona (no depende de período)
    return this.clienteService.getClientes(true).pipe(
      switchMap((clientes) => {
        return this.zonaService.getZonas().pipe(
          map((zonas) => ({ zonas, clientes }))
        );
      }),
      map(({ zonas, clientes }) => {
        // Agrupar montos en mora por zona
        const moraPorZona = new Map<number, number>();

        clientes.forEach(cliente => {
          if ((cliente.diasDeMora || 0) > 0 && (cliente.saldoTotal || 0) > 0) {
            const idZona = cliente.idZona;
            const actual = moraPorZona.get(idZona) || 0;
            moraPorZona.set(idZona, actual + (cliente.saldoTotal || 0));
          }
        });

        // Ordenar zonas y preparar datos
        const zonasOrdenadas = zonas.sort((a, b) => (a.numZona || 0) - (b.numZona || 0));
        const labels = zonasOrdenadas.map(z => z.nombreZona);
        const data = zonasOrdenadas.map(z => moraPorZona.get(z.idZona) || 0);

        return {
          type: 'bar' as const,
          data: {
            labels,
            datasets: [
              {
                label: 'Mora ($)',
                data,
                backgroundColor: '#AB47BC'
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true
          }
        };
      })
    );
  }

  getRendicionPorVendedor(periodo?: Periodo): Observable<ChartConfiguration<'bar'>> {
    // UNA consulta: PagoPedido ya trae idVendedor en el join
    return forkJoin({
      vendedores: this.vendedorService.getVendedores(),
      pagosPendientes: this.rendicionService.getPagosYCargasPendientes(periodo),
    }).pipe(
      map(({ vendedores, pagosPendientes }) => {
        // Agrupar pagos pendientes por vendedor (ya viene idVendedor en el pago)
        const rendicionPorVendedor = new Map<number, number>();
        pagosPendientes.pagos.forEach(pago => {
          const idVendedor = pago.idVendedor;
          if (idVendedor) {
            const actual = rendicionPorVendedor.get(idVendedor) || 0;
            rendicionPorVendedor.set(idVendedor, actual + pago.monto);
          }
        });

        // Preparar datos para el gráfico
        const vendedoresConRendicion = vendedores
          .filter(v => v.idVendedor && rendicionPorVendedor.has(v.idVendedor))
          .map(v => ({
            id: v.idVendedor!,
            nombre: `${v.idUsuario?.idPersona?.nombre || ''} ${v.idUsuario?.idPersona?.apellido || ''}`.trim() || `Vendedor ${v.idVendedor}`,
            monto: rendicionPorVendedor.get(v.idVendedor!) || 0,
          }))
          .sort((a, b) => b.monto - a.monto);

        const labels = vendedoresConRendicion.map(v => v.nombre);
        const data = vendedoresConRendicion.map(v => v.monto);

        return {
          type: 'bar' as const,
          data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [
              {
                label: 'Pendiente ($)',
                data: data.length > 0 ? data : [0],
                backgroundColor: '#26C6DA'
              }
            ]
          },
          options: {
            indexAxis: 'y',
            responsive: true
          }
        };
      })
    );
  }

  getTopClientesMorosos(periodo?: Periodo): Observable<ChartConfiguration<'bar'>> {
    return this.clienteService.getClientes(true).pipe(
      map((clientes) => {
        // Filtrar clientes con mora (diasDeMora > 0 y saldoTotal > 0)
        const clientesMorosos = clientes
          .filter(c => (c.diasDeMora || 0) > 0 && (c.saldoTotal || 0) > 0)
          .map(c => ({
            nombre: c.nombre,
            deuda: c.saldoTotal || 0,
            diasMora: c.diasDeMora || 0,
          }))
          .sort((a, b) => b.deuda - a.deuda)
          .slice(0, 5);

        const labels = clientesMorosos.map(c => c.nombre);
        const data = clientesMorosos.map(c => c.deuda);

        return {
          type: 'bar' as const,
          data: {
            labels: labels.length > 0 ? labels : ['Sin datos'],
            datasets: [
              {
                label: 'Deuda ($)',
                data: data.length > 0 ? data : [0],
                backgroundColor: '#EF5350'
              }
            ]
          },
          options: {
            responsive: true
          }
        };
      })
    );
  }

  // Métodos fallback para cuando hay errores
  getFacturacionPorZonaFallback(): ChartConfiguration<'bar'> {
    return {
      type: 'bar',
      data: {
        labels: ['Norte', 'Sur', 'Este', 'Oeste'],
        datasets: [
          {
            label: 'Facturación ($)',
            data: [25000, 12000, 9000, 18000],
            backgroundColor: '#42A5F5'
          }
        ]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
      }
    };
  }

  getDistribucionMetodoPagoFallback(): ChartConfiguration<'pie'> {
    return {
      type: 'pie',
      data: {
        labels: ['Efectivo', 'Tarjeta', 'Transferencia', 'MP'],
        datasets: [
          {
            data: [35, 25, 20, 20],
            backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350']
          }
        ]
      },
      options: {
        responsive: true
      }
    };
  }

  /**
   * Obtiene resumen de datos para el dashboard
   */
  getResumenDashboard(periodo?: Periodo): Observable<{
    pedidos: number;
    gananciasNetas: number;
    nuevosClientes: number;
    comisionesAPagar: number;
    cuentasPorCobrar: number;
    montosEnMora: number;
  }> {
    const pedidoFilters: any[] = [{ field: 'esActivo', op: 'eq', value: 1 }];
    const pagoFilters: any[] = [{ field: 'esActivo', op: 'eq', value: 1 }];
    
    if (periodo) {
      pedidoFilters.push(
        { field: 'fechaAlta', op: 'gte', value: periodo.fechaInicio },
        { field: 'fechaAlta', op: 'lte', value: periodo.fechaFin }
      );
      pagoFilters.push(
        { field: 'fechaPago', op: 'gte', value: periodo.fechaInicio },
        { field: 'fechaPago', op: 'lte', value: periodo.fechaFin }
      );
    }

    // Reducir a 2 consultas: pedidos con totales, y pagos
    return forkJoin({
      pedidos: this.db.list<any>('Pedido', { filters: pedidoFilters, select: ['idPedido'] }),
      pagos: this.db.listFull<PagoPedido>('PagoPedido', { filters: pagoFilters, select: ['monto'] }),
    }).pipe(
      switchMap(({ pedidos, pagos }) => {
        const pedidosIds = pedidos.map((p: any) => p.idPedido).filter((id: any) => id);
        
        // Solo obtener totales de los pedidos del período
        if (pedidosIds.length === 0) {
          return this.clienteService.getClientes(true).pipe(
            map((clientes) => ({
              pedidos: [],
              totales: [],
              pagos,
              clientes,
            }))
          );
        }
        
        return forkJoin({
          totales: this.db.listFull<{ idPedido: number; total: number }>('PedidoTotalView', {
            filters: [{ field: 'idPedido', op: 'in', value: pedidosIds }],
          }),
          clientes: this.clienteService.getClientes(true),
        }).pipe(
          map(({ totales, clientes }) => ({
            pedidos,
            totales,
            pagos,
            clientes,
          }))
        );
      }),
      map(({ pedidos, totales, pagos, clientes }) => {
        // Filtrar totales por pedidos del período
        const pedidosIds = new Set(pedidos.map((p: any) => p.idPedido));
        const totalMap = new Map<number, number>(
          totales
            .filter((t: { idPedido: number; total: number }) => pedidosIds.has(t.idPedido))
            .map((t: { idPedido: number; total: number }) => [t.idPedido, t.total])
        );
        
        // Calcular totales
        const totalFacturacion = Array.from(totalMap.values()).reduce((sum: number, total: number) => sum + total, 0);
        const totalPagado = pagos.reduce((sum: number, pago: PagoPedido) => sum + (Number(pago.monto) || 0), 0);
        const cuentasPorCobrar = totalFacturacion - totalPagado;
        
        // Calcular nuevos clientes (en el período)
        // Nota: ClienteTabla no tiene fechaAlta directamente, se calcula desde Cliente
        // Por ahora usamos un estimado basado en clientes activos
        let nuevosClientes = 0;
        if (periodo) {
          // TODO: Obtener fechaAlta real de Cliente si está disponible
          // Por ahora estimamos basado en clientes activos
          nuevosClientes = clientes.filter((c: any) => c.esActivo).length;
        }
        
        // Calcular montos en mora
        const montosEnMora = clientes
          .filter((c: any) => (c.diasDeMora || 0) > 0)
          .reduce((sum: number, c: any) => sum + (c.saldoTotal || 0), 0);
        
        // TODO: Calcular ganancias netas (necesita precioCosto de productos)
        // TODO: Calcular comisiones a pagar (necesita lógica de comisiones)
        
        return {
          pedidos: pedidos.length,
          gananciasNetas: totalFacturacion * 0.3, // Mock: 30% de ganancia estimada
          nuevosClientes,
          comisionesAPagar: totalFacturacion * 0.1, // Mock: 10% de comisiones estimadas
          cuentasPorCobrar,
          montosEnMora,
        };
      })
    );
  }
}

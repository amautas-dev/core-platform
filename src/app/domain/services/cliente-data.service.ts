// src/app/domain/services/cliente-data.service.ts
import { Injectable, inject } from '@angular/core';
import { DbService, isActive } from 'ui-kit';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  Cliente,
  ClienteDTO,
  ClienteForm,
  ClienteTabla,
  MovimientoCuentaCorriente,
} from '../../domain/models/cliente.interface';
import { Pedido } from '../../domain/models/pedido.interface';
import { DetallePedidoConProducto } from '../../domain/models/detalle-pedido.interface';
import { PagoPedido } from '../../domain/models/pago-pedido.interface';
import { PagoSaldoManual } from '../../domain/models/pago-saldo-manual.interface';
import { VisitaCliente } from '../../domain/models/visita-cliente.interface';
import { Zona } from '../../domain/models/zona.interface';
import { toSqlNow } from 'ui-kit';
import { GeolocationService } from 'ui-kit';
import { SessionDataService } from '../../core/services/session-data.service';

/**
 * Calcula el subtotal de un detalle para saldos/deudas:
 * - Pesables: monto pesado (cantidadPesada) × precio unitario.
 * - No pesables: cantidadFinal, o cantidad si no hay cantidadFinal.
 */
export function calcularSubtotalDetalle(d: {
  necesitaPesar?: number | string;
  cantidadPesada?: number | null;
  cantidadFinal?: number | null;
  cantidad?: number;
  precio_unitario?: number;
}): number {
  const precio = Number(d.precio_unitario) || 0;
  const pesable = d.necesitaPesar === 1 || d.necesitaPesar === '1';
  if (pesable) {
    const montoPesado = d.cantidadPesada != null && d.cantidadPesada > 0 ? Number(d.cantidadPesada) : 0;
    return montoPesado * precio;
  }
  const q = Number(d.cantidadFinal ?? d.cantidad ?? 0) || 0;
  return q * precio;
}

@Injectable({ providedIn: 'root' })
export class ClienteDataService {
  private db = inject(DbService);
  private geolocationService = inject(GeolocationService);
  private session = inject(SessionDataService);

  getClientes(fullList: boolean = false): Observable<ClienteTabla[]> {
    const listMethod = fullList ? this.db.listFull<any> : this.db.list<any>;

    return forkJoin({
      clientes: listMethod.call(this.db, 'Cliente', {
        joins: ['idZona', 'EstadoCuentaCorriente', 'Vendedor.Usuario.Persona'],
        orderBy: [{ field: 'orden', dir: 'asc' }],
      }),
      pedidos: this.db.listFull<Pedido>('Pedido', {
        filters: [
          { field: 'esActivo', op: 'eq', value: 1 },
          { field: 'idEstadoPedido', op: 'ne', value: 6 }, // Excluir pedidos cancelados
        ],
        orderBy: [{ field: 'fechaHoraEntrega', dir: 'desc' }],
      }),
      detalles: this.db.listFull<any>('DetallePedido', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
      pagos: this.db.listFull<PagoPedido>('PagoPedido', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
      saldosManuales: this.db.listFull<{ idSaldoManualCliente: number; idCliente: number; tipo: string; monto: number }>('SaldoManualCliente', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
      pagosSaldosManuales: this.db.listFull<PagoSaldoManual>('PagoSaldoManual', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
      visitas: this.db.listFull<VisitaCliente>('VisitaCliente', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
        orderBy: [{ field: 'fechaHoraVisita', dir: 'desc' }],
      }),
    }).pipe(
      map(({ clientes, pedidos, detalles, pagos, saldosManuales, pagosSaldosManuales, visitas }) => {
        const totalMap = new Map<number, number>();
        detalles.forEach((d: any) => {
          const id = d.idPedido;
          const prev = totalMap.get(id) || 0;
          totalMap.set(id, prev + calcularSubtotalDetalle(d));
        });
        const pagosMap = new Map<number, PagoPedido[]>();
        
        // Agrupar pagos por pedido
        pagos.forEach(p => {
          if (!pagosMap.has(p.idPedido)) {
            pagosMap.set(p.idPedido, []);
          }
          pagosMap.get(p.idPedido)!.push(p);
        });

        // Agrupar pagos de saldos manuales por saldo manual
        const pagosPorSaldoManual = new Map<number, number>();
        pagosSaldosManuales.forEach(p => {
          const totalActual = pagosPorSaldoManual.get(p.idSaldoManualCliente) || 0;
          pagosPorSaldoManual.set(p.idSaldoManualCliente, totalActual + (Number(p.monto) || 0));
        });

        // Agrupar saldos manuales por cliente, restando los pagos realizados
        const saldosManualesMap = new Map<number, { creditos: number; debitos: number }>();
        saldosManuales.forEach(s => {
          if (!saldosManualesMap.has(s.idCliente)) {
            saldosManualesMap.set(s.idCliente, { creditos: 0, debitos: 0 });
          }
          const saldoCliente = saldosManualesMap.get(s.idCliente)!;
          const monto = Number(s.monto) || 0;
          
          if (s.tipo === 'Credito') {
            // Para créditos, restar los pagos realizados
            const pagosRealizados = pagosPorSaldoManual.get(s.idSaldoManualCliente) || 0;
            const saldoPendiente = Math.max(0, monto - pagosRealizados);
            saldoCliente.creditos += saldoPendiente;
          } else {
            // Los débitos se mantienen como están (son a favor del cliente)
            saldoCliente.debitos += monto;
          }
        });

        // Agrupar pedidos por cliente (soportar idCliente como número o objeto con idCliente/id)
        const pedidosPorCliente = new Map<number, Pedido[]>();
        pedidos.forEach(p => {
          const raw = p.idCliente;
          const idCliente =
            typeof raw === 'number' ? raw : (raw && (typeof raw === 'object') ? (raw as any).idCliente ?? (raw as any).id : null);
          if (idCliente == null || idCliente === 0) return;
          const key = Number(idCliente);
          if (!pedidosPorCliente.has(key)) {
            pedidosPorCliente.set(key, []);
          }
          pedidosPorCliente.get(key)!.push(p);
        });

        // Fecha actual en UTC (solo día) para cálculo de días de mora consistente
        const hoyUtc = new Date();
        const hoySoloUtc = Date.UTC(hoyUtc.getFullYear(), hoyUtc.getMonth(), hoyUtc.getDate());

        // Función simple para calcular saldo y días de mora
        const calcularCuentaCorriente = (idCliente: number): { saldoTotal: number; diasDeMora: number } => {
          const pedidosCliente = pedidosPorCliente.get(idCliente) || [];
          let saldoTotal = 0;
          let diasDeMora = 0;
          const pedidosConSaldo: Array<{ fechaEntrega: Date }> = [];

          // Los pedidos ya vienen filtrados por esActivo = 1 desde la query
          pedidosCliente.forEach(pedido => {
            // Total del pedido
            const montoPedido = Number(totalMap.get(pedido.idPedido)) || 0;
            
            // Total de pagos del pedido - convertir cada monto a número
            const pagosPedido = pagosMap.get(pedido.idPedido) || [];
            const montoPagado = pagosPedido.reduce((sum, p) => {
              const monto = Number(p.monto) || 0;
              return sum + monto;
            }, 0);
            
            const saldoPendiente = Math.max(0, montoPedido - montoPagado);
            saldoTotal += saldoPendiente;

            if (saldoPendiente > 0 && pedido.fechaHoraEntrega) {
              const fechaEntrega = new Date(pedido.fechaHoraEntrega);
              pedidosConSaldo.push({ fechaEntrega });
            }
          });

          const saldosManual = saldosManualesMap.get(idCliente);
          if (saldosManual) {
            saldoTotal += saldosManual.creditos - saldosManual.debitos;
          }

          // Días de mora = días desde el pedido más antiguo con saldo (usar UTC para no depender de timezone)
          if (pedidosConSaldo.length > 0) {
            const pedidoMasAntiguo = pedidosConSaldo.reduce((antiguo, actual) => {
              const uA = Date.UTC(antiguo.fechaEntrega.getFullYear(), antiguo.fechaEntrega.getMonth(), antiguo.fechaEntrega.getDate());
              const uB = Date.UTC(actual.fechaEntrega.getFullYear(), actual.fechaEntrega.getMonth(), actual.fechaEntrega.getDate());
              return uB < uA ? actual : antiguo;
            });
            const entregaUtc = Date.UTC(
              pedidoMasAntiguo.fechaEntrega.getFullYear(),
              pedidoMasAntiguo.fechaEntrega.getMonth(),
              pedidoMasAntiguo.fechaEntrega.getDate()
            );
            const diffMs = hoySoloUtc - entregaUtc;
            diasDeMora = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }

          return { saldoTotal, diasDeMora };
        };

        // Función para normalizar coordenadas desde BD
        const normalizarCoordenadaBD = (coord: any): number | null => {
          if (coord === null || coord === undefined) return null;
          const num = typeof coord === 'number' ? coord : Number(coord);
          if (isNaN(num) || !isFinite(num)) return null;
          // Preservar la precisión original de la BD (hasta 14 decimales)
          return num;
        };

        // Normalizar id del cliente (puede venir como número o objeto por joins)
        const idClienteDeCliente = (c: any): number => {
          const raw = c.idCliente ?? c.id;
          if (typeof raw === 'number' && !isNaN(raw)) return raw;
          if (raw && typeof raw === 'object') return Number((raw as any).idCliente ?? (raw as any).id) || 0;
          return 0;
        };

        // Mapear clientes con sus datos de cuenta corriente
        const clientesMapeados = clientes.map((c, index) => {
          const idCliente = idClienteDeCliente(c);
          
          // Log del primer registro con coordenadas
          if (index === 0) {
            console.log('🔍 PRIMER REGISTRO - Cliente:', c.nombre, 'ID:', idCliente);
            console.log('🗺️ [ClienteDataService] Coordenadas desde BD (raw):', {
              latitud: c.latitud,
              longitud: c.longitud,
              tipoLatitud: typeof c.latitud,
              tipoLongitud: typeof c.longitud,
              latitudString: c.latitud?.toString(),
              longitudString: c.longitud?.toString(),
              decimalesLatitud: c.latitud ? (c.latitud.toString().split('.')[1]?.length || 0) : 0,
              decimalesLongitud: c.longitud ? (c.longitud.toString().split('.')[1]?.length || 0) : 0,
            });
          }
          
          const { saldoTotal, diasDeMora } = calcularCuentaCorriente(idCliente);
          
          // Log para depuración: contar clientes con deuda (solo al final)
          
          // Calcular días desde el último pedido (usar fechaHoraEntrega o fechaAlta si no hay entrega)
          const pedidosCliente = pedidosPorCliente.get(idCliente) || [];
          let diasDesdeUltimoPedido: number | undefined = undefined;
          
          if (pedidosCliente.length > 0) {
            const fechaPedido = (p: Pedido) => p.fechaHoraEntrega || p.fechaAlta || null;
            const pedidosConFecha = pedidosCliente
              .filter(p => isActive(p.esActivo) && fechaPedido(p))
              .map(p => ({ pedido: p, fecha: new Date(fechaPedido(p)!) }))
              .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
            
            if (pedidosConFecha.length > 0) {
              const ultimoPedido = pedidosConFecha[0];
              const f = new Date(ultimoPedido.fecha);
              const fechaUtc = Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());
              const diferenciaMs = hoySoloUtc - fechaUtc;
              diasDesdeUltimoPedido = Math.max(0, Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)));
            }
          }

          // Calcular días desde la última visita
          const visitasCliente = visitas.filter(v => {
            const vid = typeof (v as any).idCliente === 'number' ? (v as any).idCliente : (v as any).idCliente?.idCliente ?? (v as any).idCliente?.id;
            return vid === idCliente;
          });
          let diasDesdeUltimaVisita: number | undefined = undefined;
          
          if (visitasCliente.length > 0) {
            const visitasOrdenadas = visitasCliente
              .map(v => ({ visita: v, fecha: new Date(v.fechaHoraVisita) }))
              .sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
            
            if (visitasOrdenadas.length > 0) {
              const ultimaVisita = visitasOrdenadas[0];
              const f = new Date(ultimaVisita.fecha);
              const fechaUtc = Date.UTC(f.getFullYear(), f.getMonth(), f.getDate());
              const diferenciaMs = hoySoloUtc - fechaUtc;
              diasDesdeUltimaVisita = Math.max(0, Math.floor(diferenciaMs / (1000 * 60 * 60 * 24)));
            }
          }
          
          // Normalizar coordenadas
          const latitudNormalizada = normalizarCoordenadaBD(c.latitud);
          const longitudNormalizada = normalizarCoordenadaBD(c.longitud);
          
          // Log del resultado del primer registro con coordenadas normalizadas
          if (index === 0) {
            console.log('🔍 PRIMER REGISTRO - Resultado final:', { saldoTotal, diasDeMora });
            console.log('🗺️ [ClienteDataService] Coordenadas normalizadas:', {
              latitud: latitudNormalizada,
              longitud: longitudNormalizada,
              tipoLatitud: typeof latitudNormalizada,
              tipoLongitud: typeof longitudNormalizada,
              latitudString: latitudNormalizada?.toString(),
              longitudString: longitudNormalizada?.toString(),
              decimalesLatitud: latitudNormalizada ? (latitudNormalizada.toString().split('.')[1]?.length || 0) : 0,
              decimalesLongitud: longitudNormalizada ? (longitudNormalizada.toString().split('.')[1]?.length || 0) : 0,
            });
          }
          
          // Normalizar idZona: viene como objeto del join
          let idZonaNormalizado = 0;
          let nombreZona = '[Sin zona]';
          
          if (c.idZona) {
            if (typeof c.idZona === 'number') {
              idZonaNormalizado = c.idZona;
              nombreZona = '[Sin zona]';
            } else if (typeof c.idZona === 'object' && c.idZona !== null) {
              // Si viene como objeto del join
              idZonaNormalizado = Number(c.idZona.idZona) || 0;
              // Intentar obtener el nombre de diferentes formas posibles (PHPCrudAPI puede variar)
              nombreZona = c.idZona.nombreZona 
                ?? (c.idZona as any).nombre 
                ?? '[Sin zona]';
            }
          }
          
          return {
            id: idCliente,
            nombre: c.nombre,
            direccion: c.direccion,
            telefono: c.telefono,
            zona: nombreZona,
            idZona: idZonaNormalizado,
            idEstadoCuentaCorriente: typeof c.idEstadoCuentaCorriente === 'object' 
              ? c.idEstadoCuentaCorriente?.idEstadoCuentaCorriente ?? 0 
              : (c.idEstadoCuentaCorriente ?? 0),
            estado: c.esActivo == 1 ? 'Activo': 'Inactivo',
            estadoColor: (c.esActivo == 1 ? 'activo': 'inactivo') as 'activo' | 'inactivo',
            vendedor: c.idVendedor?.idUsuario?.idPersona
              ? `${c.idVendedor.idUsuario.idPersona.nombre} ${c.idVendedor.idUsuario.idPersona.apellido}`
              : '[Sin vendedor]',
            esActivo: c.esActivo,
            orden: c.orden ?? 0,
            usaCuentaCorriente: !!c.usaCuentaCorriente,
            usaPrecioCosto: !!c.usaPrecioCosto,
            latitud: latitudNormalizada,
            longitud: longitudNormalizada,
            diasParaMora: c.diasParaMora ?? 0,
            saldoTotal,
            diasDeMora,
            diasDesdeUltimoPedido,
            diasDesdeUltimaVisita,
            fechaHoraUltimaVisita: c.fechaHoraUltimaVisita || null,
            permitidoEditar: c.permitidoEditar ?? 1, // Por defecto permitido si no está definido
          } as ClienteTabla;
        });
        
        // Ordenar según el rol del usuario
        // Admin: por días desde último pedido (descendente)
        // Vendedor: por días desde última visita (descendente)
        const isAdmin = this.session.isAdmin;
        const clientesOrdenados = clientesMapeados.sort((a, b) => {
          if (isAdmin) {
            // Admin: ordenar por días desde último pedido
            const diasA = a.diasDesdeUltimoPedido ?? Infinity;
            const diasB = b.diasDesdeUltimoPedido ?? Infinity;
            
            if (diasA === diasB) {
              // Si tienen los mismos días, mantener orden original (por orden de cliente)
              return (a.orden ?? 0) - (b.orden ?? 0);
            }
            
            // Ordenar descendentemente por días desde último pedido
            return diasB - diasA;
          } else {
            // Vendedor: ordenar por días desde última visita
            const diasA = a.diasDesdeUltimaVisita ?? Infinity;
            const diasB = b.diasDesdeUltimaVisita ?? Infinity;
            
            if (diasA === diasB) {
              // Si tienen los mismos días, mantener orden original (por orden de cliente)
              return (a.orden ?? 0) - (b.orden ?? 0);
            }
            
            // Ordenar descendentemente por días desde última visita
            return diasB - diasA;
          }
        });
        
        // Log totales después de procesar todos los clientes
        const totalClientes = clientes.length;
        const clientesConDeuda = clientesOrdenados.filter(c => (c.saldoTotal || 0) > 0);
        console.log(`📊 [ClienteDataService] TOTALES:`);
        console.log(`   - Total clientes procesados: ${totalClientes}`);
        console.log(`   - Clientes con deuda (saldo > 0): ${clientesConDeuda.length}`);
        console.log(`   - Clientes sin deuda: ${totalClientes - clientesConDeuda.length}`);
        if (clientesConDeuda.length > 0) {
          console.log(`   - Primeros 10 con deuda:`, clientesConDeuda.slice(0, 10).map(c => ({
            id: c.id,
            nombre: c.nombre,
            saldo: c.saldoTotal,
            diasMora: c.diasDeMora,
            diasSinPedido: c.diasDesdeUltimoPedido
          })));
        }
        
        return clientesOrdenados;
      }),
      catchError(err => {
        console.error('Error en getClientes:', err);
        // En caso de error, retornar clientes sin datos de cuenta corriente
        return listMethod.call(this.db, 'Cliente', {
          joins: ['idZona', 'EstadoCuentaCorriente', 'Vendedor.Usuario.Persona'],
          orderBy: [{ field: 'orden', dir: 'asc' }],
        }).pipe(
          map((clientes): ClienteTabla[] =>
            clientes.map((c) => {
              // Normalizar zona
              let idZonaNormalizado = 0;
              let nombreZona = '[Sin zona]';
              
              if (c.idZona) {
                if (typeof c.idZona === 'number') {
                  idZonaNormalizado = c.idZona;
                  nombreZona = '[Sin zona]';
                } else if (typeof c.idZona === 'object' && c.idZona !== null) {
                  idZonaNormalizado = Number(c.idZona.idZona) || 0;
                  nombreZona = c.idZona.nombreZona 
                    ?? (c.idZona as any).nombre 
                    ?? '[Sin zona]';
                }
              }
              
              return {
                id: c.idCliente,
                nombre: c.nombre,
                direccion: c.direccion ?? '',
                telefono: c.telefono ?? '',
                zona: nombreZona,
                idZona: idZonaNormalizado,
                idEstadoCuentaCorriente: typeof c.idEstadoCuentaCorriente === 'object' 
                ? c.idEstadoCuentaCorriente?.idEstadoCuentaCorriente ?? 0 
                : (c.idEstadoCuentaCorriente ?? 0),
              estado: c.esActivo == 1 ? 'Activo': 'Inactivo',
              estadoColor: (c.esActivo == 1 ? 'activo': 'inactivo') as 'activo' | 'inactivo',
              vendedor: c.idVendedor?.idUsuario?.idPersona
                ? `${c.idVendedor.idUsuario.idPersona.nombre} ${c.idVendedor.idUsuario.idPersona.apellido}`
                : '[Sin vendedor]',
              esActivo: c.esActivo,
              orden: c.orden ?? 0,
              usaCuentaCorriente: !!c.usaCuentaCorriente,
              usaPrecioCosto: !!c.usaPrecioCosto,
              latitud: (() => {
                const coord = c.latitud;
                if (coord === null || coord === undefined) return null;
                const num = typeof coord === 'number' ? coord : Number(coord);
                return isNaN(num) || !isFinite(num) ? null : num;
              })(),
              longitud: (() => {
                const coord = c.longitud;
                if (coord === null || coord === undefined) return null;
                const num = typeof coord === 'number' ? coord : Number(coord);
                return isNaN(num) || !isFinite(num) ? null : num;
              })(),
              diasParaMora: c.diasParaMora ?? 0,
              saldoTotal: 0,
              diasDeMora: 0,
              fechaHoraUltimaVisita: c.fechaHoraUltimaVisita || null,
            };
            })
          )
        );
      })
    );
  }


  getClientesPorZona(idZona: number): Observable<ClienteTabla[]> {
    return this.db
      .list<any>('Cliente', {
        joins: ['Zona', 'EstadoCuentaCorriente', 'Vendedor.Usuario.Persona'],
        filters: [{ field: 'idZona', op: 'eq', value: idZona }],
        orderBy: [{ field: 'orden', dir: 'asc' }],
      })
      .pipe(
        map((clientes) =>
          clientes.map((c) => ({
            id: c.idCliente,
            nombre: c.nombre,
            direccion: c.direccion,
            telefono: c.telefono,
            idEstadoCuentaCorriente: c.idEstadoCuentaCorriente,
            zona: c.idZona?.nombreZona ?? '[Sin zona]',
            idZona: c.idZona,
            esActivo: c.esActivo,
            estadoColor: c.esActivo == 1 ? 'activo': 'inactivo',
            vendedor: c.idVendedor?.idUsuario?.idPersona
              ? `${c.idVendedor.idUsuario.idPersona.nombre} ${c.idVendedor.idUsuario.idPersona.apellido}`
              : '[Sin vendedor]',
            orden: c.orden ?? 0,
            usaCuentaCorriente: !!c.usaCuentaCorriente,
            usaPrecioCosto: !!c.usaPrecioCosto,
            latitud: c.latitud,
            longitud: c.longitud,
            diasParaMora: c.diasParaMora ?? 0,
          }))
        )
      );
  }

  /**
   * Indica si ya existe un cliente con el mismo nombre y teléfono (normalizado).
   * Para alta: no pasar excluirId. Para edición: pasar el id del cliente actual para no considerarlo duplicado.
   */
  existeClienteConNombreYTelefono(
    nombre: string,
    telefono: string,
    excluirId?: number
  ): Observable<boolean> {
    const nombreTrim = (nombre ?? '').trim();
    const telefonoNorm = (telefono ?? '').replace(/\D/g, '');
    if (!nombreTrim) {
      return of(false);
    }
    return this.db
      .listFull<{ idCliente: number; nombre: string; telefono: string }>('Cliente', {
        filters: [{ field: 'nombre', op: 'eq', value: nombreTrim }],
        select: ['idCliente', 'nombre', 'telefono'],
      })
      .pipe(
        map((lista) => {
          const otroTelefonoNorm = (t: string | null | undefined) => (t ?? '').replace(/\D/g, '');
          const coincide = lista.some(
            (c) =>
              otroTelefonoNorm(c.telefono) === telefonoNorm &&
              (excluirId == null || c.idCliente !== excluirId)
          );
          return coincide;
        }),
        catchError(() => of(false))
      );
  }

  crearCliente(dto: ClienteForm): Observable<any> {
    return this.db.create('Cliente', dto);
  }

  actualizarCliente(id: number, dto: ClienteForm): Observable<any> {
    return this.db.update('Cliente', id, dto, false);
  }

  desactivarCliente(id: number): Observable<any> {
    const userId = this.db.getUserId();
    return this.db.deactivate('Cliente', id, userId!);
  }

  reactivarCliente(id: number): Observable<any> {
    return this.db.reactivate('Cliente', id);
  }

  getCuentaCorrienteCliente(idCliente: number): Observable<{
    saldoActual: number;
    movimientos: MovimientoCuentaCorriente[];
  }> {
    return forkJoin({
      movimientos: this.db.listFull<MovimientoCuentaCorriente>(
        'CuentaCorrienteMovimientos',
        {
          filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
          orderBy: [{ field: 'fecha', dir: 'asc' }],
        }
      ),
    }).pipe(
      map(({ movimientos }) => {
        let saldo = 0;
        const enriched = movimientos.map((mov) => {
          saldo += mov.tipo === 'Credito' ? -mov.monto : mov.monto;
          return { ...mov, saldoPosterior: saldo };
        });

        return {
          saldoActual: saldo,
          movimientos: enriched,
        };
      })
    );
  }
  actualizarOrdenClientes(cambios: { id: number; orden: number }[]) {
    const ops = cambios.map((c) =>
      this.db.update('Cliente', c.id, { orden: c.orden })
    );

    return forkJoin(ops);
  }

  habilitarExcepcion(idCliente: number): Observable<any> {
    return this.db.update('Cliente', idCliente, { habilitadoExcep: true });
  }

  habilitarEdicionCliente(idCliente: number): Observable<any> {
    return this.db.update('Cliente', idCliente, { permitidoEditar: 1 });
  }

  /**
   * Registra una visita al cliente validando la ubicación GPS
   * @param idCliente ID del cliente
   * @param maxDistanceMeters Distancia máxima permitida en metros (por defecto 100m)
   * @returns Observable con el resultado de la operación
   */
  registrarVisita(
    idCliente: number,
    maxDistanceMeters: number = 100
  ): Observable<{ success: boolean; message: string; distance?: number }> {
    return new Observable((observer) => {
      // 1. Obtener datos del cliente (incluyendo coordenadas)
      this.db
        .list<any>('Cliente', {
          filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
          select: ['idCliente', 'nombre', 'latitud', 'longitud'],
        })
        .subscribe({
          next: (clientes) => {
            if (clientes.length === 0) {
              observer.error({ success: false, message: 'Cliente no encontrado' });
              return;
            }

            const cliente = clientes[0];

            // 2. Verificar que el cliente tenga coordenadas
            if (!cliente.latitud || !cliente.longitud) {
              observer.error({
                success: false,
                message: 'El cliente no tiene ubicación registrada. Por favor, asigna una ubicación primero.',
              });
              return;
            }

            // 3. Obtener ubicación actual del vendedor (GPS)
            this.geolocationService.getCurrentPosition().subscribe({
              next: (vendedorPosition) => {
                // 4. Calcular distancia entre vendedor y cliente
                const distance = this.geolocationService.calculateDistance(
                  vendedorPosition.latitude,
                  vendedorPosition.longitude,
                  cliente.latitud,
                  cliente.longitud
                );

                // 5. Verificar si está dentro del radio permitido
                if (distance > maxDistanceMeters) {
                  observer.error({
                    success: false,
                    message: `Estás demasiado lejos del cliente. Distancia: ${Math.round(distance)}m (máximo permitido: ${maxDistanceMeters}m)`,
                    distance: Math.round(distance),
                  });
                  return;
                }

                // 6. Actualizar fechaHoraUltimaVisita y registrar visita en tabla VisitaCliente
                const fechaHoraVisita = toSqlNow();
                const idUsuario = this.session.idUsuario;
                const userData = this.session.userData;
                const idVendedor = userData?.idVendedor || null;

                // Crear registro de visita
                const visitaData: any = {
                  idCliente,
                  idUsuario,
                  idVendedor,
                  idPedido: null, // Sin pedido
                  fechaHoraVisita,
                  latitudVisita: vendedorPosition.latitude,
                  longitudVisita: vendedorPosition.longitude,
                  distanciaMetros: Math.round(distance),
                  tomoPedido: 0,
                  motivoVisita: 'Seguimiento',
                  esActivo: 1,
                  fechaAlta: fechaHoraVisita,
                  idUsuarioAlta: idUsuario,
                };

                // Actualizar fechaHoraUltimaVisita y crear registro de visita en paralelo
                forkJoin({
                  updateCliente: this.db.update('Cliente', idCliente, {
                    fechaHoraUltimaVisita: fechaHoraVisita,
                  }),
                  createVisita: this.db.create('VisitaCliente', visitaData),
                }).subscribe({
                  next: () => {
                    observer.next({
                      success: true,
                      message: `Visita registrada correctamente. Distancia: ${Math.round(distance)}m`,
                      distance: Math.round(distance),
                    });
                    observer.complete();
                  },
                  error: (err) => {
                    console.error('Error al registrar visita:', err);
                    observer.error({
                      success: false,
                      message: 'Error al registrar la visita. Por favor, intenta nuevamente.',
                    });
                  },
                });
              },
              error: (geoError: any) => {
                observer.error({
                  success: false,
                  message: geoError.message || 'Error al obtener tu ubicación GPS',
                });
              },
            });
          },
          error: (err) => {
            console.error('Error al obtener datos del cliente:', err);
            observer.error({
              success: false,
              message: 'Error al obtener datos del cliente',
            });
          },
        });
    });
  }

  /**
   * Actualiza la fechaHoraUltimaVisita cuando se crea un pedido y registra la visita
   * @param idCliente ID del cliente
   * @param idPedido ID del pedido creado
   * @param latitudVisita Latitud donde se registró la visita (opcional)
   * @param longitudVisita Longitud donde se registró la visita (opcional)
   * @param distanciaMetros Distancia en metros (opcional)
   */
  actualizarFechaVisitaPorPedido(
    idCliente: number,
    idPedido?: number,
    latitudVisita?: number | null,
    longitudVisita?: number | null,
    distanciaMetros?: number | null
  ): Observable<any> {
    const fechaHoraVisita = toSqlNow();
    const idUsuario = this.session.idUsuario;
    const userData = this.session.userData;
    const idVendedor = userData?.idVendedor || null;

    // Crear registro de visita con pedido
    const visitaData: any = {
      idCliente,
      idUsuario,
      idVendedor,
      idPedido: idPedido || null,
      fechaHoraVisita,
      latitudVisita: latitudVisita || null,
      longitudVisita: longitudVisita || null,
      distanciaMetros: distanciaMetros || null,
      tomoPedido: idPedido ? 1 : 0,
      motivoVisita: 'Pedido',
      esActivo: 1,
      fechaAlta: fechaHoraVisita,
      idUsuarioAlta: idUsuario,
    };

    // Actualizar fechaHoraUltimaVisita y crear registro de visita en paralelo
    return forkJoin({
      updateCliente: this.db.update('Cliente', idCliente, {
        fechaHoraUltimaVisita: fechaHoraVisita,
      }),
      createVisita: this.db.create('VisitaCliente', visitaData),
    }).pipe(
      map(() => ({ success: true })),
      catchError((err) => {
        console.error('Error al registrar visita con pedido:', err);
        // Si falla la creación de la visita, al menos actualizar la fecha en Cliente
        return this.db.update('Cliente', idCliente, {
          fechaHoraUltimaVisita: fechaHoraVisita,
        }).pipe(
          map(() => ({ success: true, warning: 'Visita registrada pero no se pudo crear el registro detallado' }))
        );
      })
    );
  }

  getCuentaCorrienteCompleta(idCliente: number): Observable<{
    cliente: ClienteTabla;
    pedidos: Array<{
      pedido: Pedido;
      detalles: DetallePedidoConProducto[];
      montoPedido: number;
      pagos: PagoPedido[];
      montoPagado: number;
      saldoPendiente: number;
      diasDesdeEntrega: number;
    }>;
    diasDeMora: number;
    saldoTotal: number; // Saldo total calculado desde movimientos de cuenta corriente
  }> {
    return forkJoin({
      cliente: this.db.list<any>('Cliente', {
        filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
        joins: ['Zona', 'EstadoCuentaCorriente', 'Vendedor.Usuario.Persona'],
      }).pipe(
        map(clientes => {
          const c = clientes[0];
          if (!c) {
            throw new Error(`Cliente con id ${idCliente} no encontrado`);
          }
          return {
            id: c.idCliente,
            nombre: c.nombre,
            direccion: c.direccion ?? '',
            telefono: c.telefono ?? '',
            zona: c.idZona?.nombreZona ?? '[Sin zona]',
            idZona: (() => {
              if (!c.idZona) return 0;
              if (typeof c.idZona === 'number') return c.idZona;
              if (typeof c.idZona === 'object' && c.idZona.idZona) return Number(c.idZona.idZona) || 0;
              return 0;
            })(),
            idEstadoCuentaCorriente: typeof c.idEstadoCuentaCorriente === 'object' ? c.idEstadoCuentaCorriente?.idEstadoCuentaCorriente ?? 0 : (c.idEstadoCuentaCorriente ?? 0),
            estado: c.esActivo == 1 ? 'Activo' : 'Inactivo',
            estadoColor: c.esActivo == 1 ? 'activo' as const : 'inactivo' as const,
            vendedor: c.idVendedor?.idUsuario?.idPersona
              ? `${c.idVendedor.idUsuario.idPersona.nombre} ${c.idVendedor.idUsuario.idPersona.apellido}`
              : '[Sin vendedor]',
            esActivo: c.esActivo,
            orden: c.orden ?? 0,
            usaCuentaCorriente: !!c.usaCuentaCorriente,
            usaPrecioCosto: !!c.usaPrecioCosto,
            latitud: (() => {
              const coord = c.latitud;
              if (coord === null || coord === undefined) return null;
              const num = typeof coord === 'number' ? coord : Number(coord);
              return isNaN(num) || !isFinite(num) ? null : num;
            })(),
            longitud: (() => {
              const coord = c.longitud;
              if (coord === null || coord === undefined) return null;
              const num = typeof coord === 'number' ? coord : Number(coord);
              return isNaN(num) || !isFinite(num) ? null : num;
            })(),
            diasParaMora: c.diasParaMora ?? 0,
          } as ClienteTabla;
        })
      ),
      pedidos: this.db.listFull<Pedido>('Pedido', {
        filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
        orderBy: [{ field: 'fechaHoraEntrega', dir: 'desc' }],
      }),
      detalles: this.db.listFull<DetallePedidoConProducto>('DetallePedido', {
        joins: ['Producto'],
      }),
      pagos: this.db.listFull<PagoPedido>('PagoPedido', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
      saldosManuales: this.db.listFull<{ idSaldoManualCliente: number; idCliente: number; tipo: string; monto: number }>('SaldoManualCliente', {
        filters: [
          { field: 'idCliente', op: 'eq', value: idCliente },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
      }),
      pagosSaldosManuales: this.db.listFull<PagoSaldoManual>('PagoSaldoManual', {
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      }),
    }).pipe(
      map(({ cliente, pedidos, detalles, pagos, saldosManuales, pagosSaldosManuales }) => {
        const detallesMap = new Map<number, DetallePedidoConProducto[]>();
        const pagosMap = new Map<number, PagoPedido[]>();
        const idsPedidos = new Set(pedidos.map(p => p.idPedido));

        // Filtrar detalles y pagos solo para pedidos del cliente, y enriquecer con nombre y subtotal
        detalles.filter(d => idsPedidos.has(d.idPedido)).forEach((d: any) => {
          if (!detallesMap.has(d.idPedido)) {
            detallesMap.set(d.idPedido, []);
          }
          
          // Extraer nombre del producto desde el join (puede venir en diferentes formatos)
          let productoNombre = '';
          if (d.productoNombre) {
            // Si ya viene mapeado
            productoNombre = d.productoNombre;
          } else if (d.idProducto && typeof d.idProducto === 'object') {
            // Si viene como objeto anidado
            productoNombre = d.idProducto.nombreProducto || '';
          } else if (d.Producto) {
            // Si viene como propiedad Producto
            productoNombre = d.Producto.nombreProducto || '';
          } else if ((d as any).nombreProducto) {
            // Si viene directamente en el detalle
            productoNombre = (d as any).nombreProducto;
          }
          
          const subtotal = calcularSubtotalDetalle(d);
          detallesMap.get(d.idPedido)!.push({
            ...d,
            productoNombre: productoNombre || '[Sin nombre]',
            subtotal: subtotal || 0,
          });
        });

        pagos.filter(p => idsPedidos.has(p.idPedido)).forEach(p => {
          if (!pagosMap.has(p.idPedido)) {
            pagosMap.set(p.idPedido, []);
          }
          pagosMap.get(p.idPedido)!.push(p);
        });

        // Calcular fecha actual para días desde entrega (usar UTC para evitar 0 por zona horaria)
        const hoyUtc = new Date();
        const hoySoloUtc = Date.UTC(hoyUtc.getFullYear(), hoyUtc.getMonth(), hoyUtc.getDate());

        // Procesar cada pedido: monto desde suma de detalles (cantidadFinal/cantidad; pesables: cantidadPesada × precio)
        const pedidosCompletos = pedidos.map(pedido => {
          const dets = detallesMap.get(pedido.idPedido) ?? [];
          const montoPedido = dets.reduce((s, d) => s + (Number((d as any).subtotal) || 0), 0);
          const pagosPedido = pagosMap.get(pedido.idPedido) ?? [];
          const montoPagado = pagosPedido.reduce((sum, p) => {
            const monto = Number(p.monto) || 0;
            return sum + monto;
          }, 0);
          const saldoPendiente = Math.max(0, montoPedido - montoPagado);

          // Calcular días desde entrega (diferencia en días por fecha UTC para no depender de timezone)
          let diasDesdeEntrega = 0;
          if (pedido.fechaHoraEntrega) {
            const fechaEntrega = new Date(pedido.fechaHoraEntrega);
            const entregaSoloUtc = Date.UTC(fechaEntrega.getFullYear(), fechaEntrega.getMonth(), fechaEntrega.getDate());
            const diffMs = hoySoloUtc - entregaSoloUtc;
            diasDesdeEntrega = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }

          return {
            pedido,
            detalles: detallesMap.get(pedido.idPedido) ?? [],
            montoPedido,
            pagos: pagosPedido,
            montoPagado,
            saldoPendiente,
            diasDesdeEntrega,
          };
        });

        // Calcular días de mora (días del pedido más antiguo con saldo pendiente)
        let diasDeMora = 0;
        const pedidosConSaldo = pedidosCompletos.filter(p => p.saldoPendiente > 0 && p.pedido.fechaHoraEntrega);
        if (pedidosConSaldo.length > 0) {
          const pedidoMasAntiguo = pedidosConSaldo.reduce((antiguo, actual) => {
            if (!antiguo.pedido.fechaHoraEntrega) return actual;
            if (!actual.pedido.fechaHoraEntrega) return antiguo;
            const fechaAntiguo = new Date(antiguo.pedido.fechaHoraEntrega);
            const fechaActual = new Date(actual.pedido.fechaHoraEntrega);
            return fechaAntiguo < fechaActual ? antiguo : actual;
          });
          
          if (pedidoMasAntiguo.pedido.fechaHoraEntrega) {
            const fechaEntrega = new Date(pedidoMasAntiguo.pedido.fechaHoraEntrega);
            const entregaSoloUtc = Date.UTC(fechaEntrega.getFullYear(), fechaEntrega.getMonth(), fechaEntrega.getDate());
            const diffMs = hoySoloUtc - entregaSoloUtc;
            diasDeMora = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
          }
        }

        // Calcular saldo total como suma de saldos pendientes de todos los pedidos
        let saldoTotal = pedidosCompletos.reduce((sum, p) => sum + (p.saldoPendiente || 0), 0);

        // Calcular pagos por saldo manual
        const pagosPorSaldoManual = new Map<number, number>();
        pagosSaldosManuales.forEach(p => {
          const totalActual = pagosPorSaldoManual.get(p.idSaldoManualCliente) || 0;
          pagosPorSaldoManual.set(p.idSaldoManualCliente, totalActual + (Number(p.monto) || 0));
        });

        // Sumar saldos manuales (Credito = deuda, Debito = a favor)
        // Para créditos, restar los pagos realizados
        saldosManuales.forEach(s => {
          const monto = Number(s.monto) || 0;
          if (s.tipo === 'Credito') {
            const pagosRealizados = pagosPorSaldoManual.get(s.idSaldoManualCliente) || 0;
            const saldoPendiente = Math.max(0, monto - pagosRealizados);
            saldoTotal += saldoPendiente;
          } else {
            saldoTotal -= monto;
          }
        });

        return {
          cliente,
          pedidos: pedidosCompletos,
          diasDeMora,
          saldoTotal,
        };
      }),
      catchError(err => {
        console.error('Error en getCuentaCorrienteCompleta:', err);
        throw err;
      })
    );
  }
}

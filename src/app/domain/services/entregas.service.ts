import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, forkJoin, map, of, switchMap, catchError } from 'rxjs';
import { EntregaPedido, EntregaTabla, EstadoEntrega } from '../models/entrega.interface';
import { EntregaProducto } from '../models/entrega-producto.interface';
import { DetallePedido, DetallePedidoConProducto } from '../models/detalle-pedido.interface';
import { PagoPedido, MetodoPago } from '../models/pago-pedido.interface';
import { Pedido } from '../models/pedido.interface';
import { Carga } from '../models/carga.interface';

/**
 * Servicio de negocio para gestionar entregas
 * Maneja toda la lógica de entregas: listado, rutas, registro, actualización de stock, pagos, etc.
 */
@Injectable({ providedIn: 'root' })
export class EntregasService {
  private db = inject(DbService);

  /**
   * Obtiene una carga por ID con información completa
   */
  getCarga(idCarga: number): Observable<Carga> {
    return this.db.getById<Carga>('Carga', idCarga, {
      joins: ['Usuario.Rol', 'EstadoCarga', 'CargaxZona.Zona'],
    });
  }

  /**
   * Obtiene todos los pedidos de una carga para entregas
   * Retorna los pedidos con información del cliente, vendedor, zona, etc.
   * Usa la tabla PedidoxCarga para relacionar Pedido con Carga
   */
  getPedidosPorCarga(idCarga: number, incluirEntregados: boolean = false): Observable<EntregaTabla[]> {
    return forkJoin({
      pedidoxCarga: this.db.listFull<any>('PedidoxCarga', {
        filters: [
          { field: 'idCarga', op: 'eq', value: idCarga },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
        joins: [
          'Pedido.Cliente',
          'Pedido.Vendedor.Usuario.Persona',
          'Pedido.Zona',
          'Pedido.EstadoPedido',
        ],
      }),
      totales: this.db.listFull<{ idPedido: number; total: number }>('PedidoTotalView'),
    }).pipe(
      map(({ pedidoxCarga, totales }) => {
        // Agrupar por pedido
        const pedidosMap = new Map<number, EntregaTabla>();
        const totalMap = new Map(totales.map((t) => [t.idPedido, t.total]));

        pedidoxCarga.forEach((pxc: any) => {
          // Cuando haces join con Pedido, idPedido se convierte en el objeto Pedido completo
          const pedido = pxc.idPedido;
          if (!pedido) return;

          // Extraer idPedido
          const idPedido = typeof pedido === 'object' ? pedido.idPedido : pedido;
          if (!idPedido || pedidosMap.has(idPedido)) return;

          const pedidoObj = typeof pedido === 'object' ? pedido : {};

          // Extraer cliente (puede venir como idCliente (número) o Cliente (objeto) después del join)
          const clienteRaw = pedidoObj.idCliente || (pedidoObj as any).Cliente;
          const cliente = typeof clienteRaw === 'object' ? clienteRaw : {};

          // Extraer vendedor
          const vendedorRaw = pedidoObj.idVendedor || (pedidoObj as any).Vendedor;
          const vendedor = typeof vendedorRaw === 'object' ? vendedorRaw : {};
          const persona = vendedor?.Usuario?.Persona || vendedor?.idUsuario?.idPersona || {};

          // Extraer zona
          const zonaRaw = pedidoObj.idZona || (pedidoObj as any).Zona;
          const zona = typeof zonaRaw === 'object' ? zonaRaw : {};

          // Determinar estado de entrega basado en idEstadoPedido
          // idEstadoPedido = 5 es Entregado, 3 o 4 son pendientes
          const idEstadoPedido = typeof pedidoObj.idEstadoPedido === 'object' 
            ? pedidoObj.idEstadoPedido?.idEstadoPedido 
            : pedidoObj.idEstadoPedido;
          
          let estadoEntrega: EstadoEntrega = 'PENDIENTE';
          
          if (idEstadoPedido === 5) {
            estadoEntrega = 'ENTREGADO';
          } else if (idEstadoPedido === 4 || idEstadoPedido === 3) {
            // Estados 3 y 4 son entregas pendientes
            estadoEntrega = 'PENDIENTE';
          }
          // TODO: Implementar lógica para 'EN_RUTA' si existe un campo o estado específico

          // Si no queremos incluir entregados y el estado es ENTREGADO, lo saltamos
          if (!incluirEntregados && estadoEntrega === 'ENTREGADO') {
            return;
          }

          // Obtener datos del cliente
          const idCliente = typeof cliente === 'object' ? (cliente.idCliente || 0) : 0;
          const nombreCliente = cliente.nombre || '';
          const direccionCliente = cliente.direccion || '';
          const saldoCliente = cliente.saldoTotal || 0;
          
          // Extraer coordenadas correctamente (pueden venir como string, number o null)
          let latitudCliente: number | null = null;
          let longitudCliente: number | null = null;
          
          if (cliente.latitud !== null && cliente.latitud !== undefined) {
            const lat = typeof cliente.latitud === 'string' ? parseFloat(cliente.latitud) : Number(cliente.latitud);
            if (!isNaN(lat) && isFinite(lat) && lat >= -90 && lat <= 90) {
              latitudCliente = lat;
            }
          }
          
          if (cliente.longitud !== null && cliente.longitud !== undefined) {
            const lng = typeof cliente.longitud === 'string' ? parseFloat(cliente.longitud) : Number(cliente.longitud);
            if (!isNaN(lng) && isFinite(lng) && lng >= -180 && lng <= 180) {
              longitudCliente = lng;
            }
          }
          
          // Validar que ambas coordenadas sean válidas
          const tieneUbicacion = (
            latitudCliente !== null && 
            longitudCliente !== null &&
            typeof latitudCliente === 'number' && 
            typeof longitudCliente === 'number' &&
            !isNaN(latitudCliente) && 
            !isNaN(longitudCliente) &&
            isFinite(latitudCliente) && 
            isFinite(longitudCliente) &&
            latitudCliente >= -90 && 
            latitudCliente <= 90 &&
            longitudCliente >= -180 && 
            longitudCliente <= 180
          );
          
          const ordenCliente = cliente.orden ?? undefined;

          // Obtener datos del vendedor
          const nombreVendedor = persona.nombre || persona.apellido 
            ? `${persona.nombre || ''} ${persona.apellido || ''}`.trim()
            : '[Sin vendedor]';

          // Obtener datos de la zona
          const nombreZona = zona.nombreZona || '';

          pedidosMap.set(idPedido, {
            idPedido,
            idCliente,
            numeroPedido: `#${idPedido}`,
            cliente: nombreCliente,
            direccion: direccionCliente,
            vendedor: nombreVendedor,
            zona: nombreZona,
            totalPedido: totalMap.get(idPedido) || 0,
            saldoCCActual: saldoCliente,
            estadoEntrega,
            tieneUbicacion,
            latitud: latitudCliente,
            longitud: longitudCliente,
            ordenEntrega: ordenCliente,
          });
        });

        return Array.from(pedidosMap.values());
      })
    );
  }

  /**
   * Obtiene el detalle completo de un pedido para entrega
   */
  getDetallePedidoEntrega(idPedido: number, idCarga?: number): Observable<EntregaPedido | null> {
    return forkJoin({
      pedido: this.db.getById<any>('Pedido', idPedido, {
        joins: [
          'Cliente',
          'Vendedor.Usuario.Persona',
          'Zona',
          'EstadoPedido',
        ],
      }),
      detalles: this.db.listFull<DetallePedidoConProducto>('DetallePedido', {
        filters: [
          { field: 'idPedido', op: 'eq', value: idPedido },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
        joins: ['Producto', 'ProductoDerivado'],
      }),
      total: this.db.listFull<{ idPedido: number; total: number }>('PedidoTotalView', {
        filters: [{ field: 'idPedido', op: 'eq', value: idPedido }],
      }).pipe(map(totales => totales[0]?.total || 0)),
      // Obtener idCarga desde PedidoxCarga si no se proporciona
      pedidoxCarga: idCarga ? of({ idCarga }) : this.db.listFull<any>('PedidoxCarga', {
        filters: [
          { field: 'idPedido', op: 'eq', value: idPedido },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
      }).pipe(
        map(pxc => pxc.length > 0 ? { idCarga: pxc[0].idCarga } : { idCarga: 0 })
      ),
    }).pipe(
      map(({ pedido, detalles, total, pedidoxCarga }) => {
        if (!pedido) return null;

        const cliente = pedido.idCliente || {};
        const vendedor = pedido.idVendedor || {};
        const persona = vendedor.idUsuario?.idPersona || {};
        const zona = pedido.idZona || {};

        // Determinar estado de entrega basado en idEstadoPedido
        // idEstadoPedido = 5 es Entregado, 3 o 4 son pendientes
        const idEstadoPedido = typeof pedido.idEstadoPedido === 'object' 
          ? pedido.idEstadoPedido?.idEstadoPedido 
          : pedido.idEstadoPedido;
        
        let estadoEntrega: EstadoEntrega = 'PENDIENTE';
        const fechaEntrega = pedido.fechaHoraEntrega;
        
        if (idEstadoPedido === 5) {
          estadoEntrega = 'ENTREGADO';
        } else if (idEstadoPedido === 4 || idEstadoPedido === 3) {
          // Estados 3 y 4 son entregas pendientes
          estadoEntrega = 'PENDIENTE';
        }

        // Transformar detalles a productos de entrega
        const productos: EntregaProducto[] = detalles.map((d: any) => {
          // Extraer idProducto correctamente (puede venir como objeto del join o como número)
          const idProductoObj = typeof d.idProducto === 'object' ? d.idProducto : null;
          const idProductoNum = idProductoObj ? (idProductoObj.idProducto || 0) : (Number(d.idProducto) || 0);
          
          // Extraer idProductoDerivado correctamente
          const idProductoDerivadoObj = typeof d.idProductoDerivado === 'object' ? d.idProductoDerivado : null;
          const idProductoDerivadoNum = idProductoDerivadoObj 
            ? (idProductoDerivadoObj.idProductoDerivado || null) 
            : (d.idProductoDerivado ? Number(d.idProductoDerivado) : null);
          
          const producto = idProductoObj || {};
          const derivado = idProductoDerivadoObj || null;
          const cantidadPedida = d.cantidad || 0;
          
          return {
            ...d,
            idProducto: idProductoNum, // Asegurar que siempre sea número
            idProductoDerivado: idProductoDerivadoNum, // Asegurar que sea número o null
            nombreProducto: producto.nombreProducto || 'Producto Desconocido',
            nombreDerivado: derivado?.nombreProductoDerivado || undefined,
            marca: producto.marca || '',
            cantidadPedida,
            cantidadEntregar: cantidadPedida,
            cantidadDevolver: 0,
            cantidadFinal: cantidadPedida,
            precioUnitario: d.precio_unitario || 0,
            subtotal: cantidadPedida * (d.precio_unitario || 0),
            necesitaPesar: d.necesitaPesar || 0,
            tieneError: false,
          };
        });

        const idCargaFinal = pedidoxCarga?.idCarga || idCarga || 0;

        return {
          idPedido: pedido.idPedido,
          idCarga: idCargaFinal,
          idCliente: typeof cliente === 'object' ? cliente.idCliente : cliente,
          idVendedor: typeof vendedor === 'object' ? (vendedor.idVendedor || 0) : 0,
          idZona: typeof zona === 'object' ? zona.idZona : zona,
          cliente: cliente as any,
          nombreCliente: typeof cliente === 'object' ? (cliente.nombre || '') : '',
          direccionCliente: typeof cliente === 'object' ? (cliente.direccion || '') : '',
          telefonoCliente: typeof cliente === 'object' ? (cliente.telefono || '') : '',
          latitud: typeof cliente === 'object' ? (cliente.latitud || null) : null,
          longitud: typeof cliente === 'object' ? (cliente.longitud || null) : null,
          totalPedido: total,
          saldoCCActual: typeof cliente === 'object' ? (cliente.saldoTotal || 0) : 0,
          fechaHoraEntrega: pedido.fechaHoraEntrega,
          estadoEntrega,
          vendedor: vendedor as any,
          zona: zona as any,
          observaciones: pedido.observaciones,
          ordenEntrega: typeof cliente === 'object' ? (cliente.orden || null) : null,
          fechaAlta: pedido.fechaAlta,
          fechaHoraEntregaReal: fechaEntrega || null,
          productos, // Agregar productos
        };
      })
    );
  }

  /**
   * Calcula la ruta optimizada usando el algoritmo del vecino más cercano (Haversine)
   * Retorna los pedidos ordenados por distancia
   */
  calcularRutaOptimizada(pedidos: EntregaTabla[], puntoInicio: { lat: number; lng: number }): EntregaTabla[] {
    if (!pedidos || pedidos.length === 0) return [];

    // Si hay orden personalizado, respetarlo
    const conOrden = pedidos.filter(p => p.ordenEntrega !== null && p.ordenEntrega !== undefined);
    const sinOrden = pedidos.filter(p => p.ordenEntrega === null || p.ordenEntrega === undefined);

    if (conOrden.length > 0 && sinOrden.length === 0) {
      // Todos tienen orden, ordenar por ese campo
      return [...pedidos].sort((a, b) => (a.ordenEntrega || 0) - (b.ordenEntrega || 0));
    }

    // Filtrar solo los que tienen ubicación
    const conUbicacion = pedidos.filter(p => p.tieneUbicacion && p.latitud && p.longitud);
    const sinUbicacion = pedidos.filter(p => !p.tieneUbicacion || !p.latitud || !p.longitud);

    if (conUbicacion.length === 0) {
      return pedidos;
    }

    // Algoritmo del vecino más cercano
    const ruta: EntregaTabla[] = [];
    let actual = puntoInicio;
    let disponibles = [...conUbicacion];

    while (disponibles.length > 0) {
      let masCercano = disponibles[0];
      let distanciaMinima = this.calcularDistanciaHaversine(
        actual.lat,
        actual.lng,
        masCercano.latitud!,
        masCercano.longitud!
      );

      for (const pedido of disponibles) {
        const distancia = this.calcularDistanciaHaversine(
          actual.lat,
          actual.lng,
          pedido.latitud!,
          pedido.longitud!
        );
        if (distancia < distanciaMinima) {
          distanciaMinima = distancia;
          masCercano = pedido;
        }
      }

      ruta.push(masCercano);
      actual = { lat: masCercano.latitud!, lng: masCercano.longitud! };
      disponibles = disponibles.filter(p => p.idPedido !== masCercano.idPedido);
    }

    // Agregar los pedidos sin ubicación al final
    return [...ruta, ...sinUbicacion];
  }

  /**
   * Calcula la distancia entre dos puntos usando la fórmula de Haversine
   */
  private calcularDistanciaHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.gradosARadianes(lat2 - lat1);
    const dLon = this.gradosARadianes(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.gradosARadianes(lat1)) *
        Math.cos(this.gradosARadianes(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private gradosARadianes(grados: number): number {
    return grados * (Math.PI / 180);
  }

  /**
   * Registra una entrega completa: actualiza DetallePedido, crea MovimientoStock, actualiza Pedido, etc.
   */
  registrarEntrega(data: {
    idPedido: number;
    productos: EntregaProducto[];
    pagos: PagoPedido[];
    devoluciones?: any[]; // DevolucionEntrega[]
    observaciones?: string;
    idCarga?: number | null; // Agregar idCarga opcional
  }): Observable<void> {
    /**
     * Formatea la fecha actual en formato MySQL (YYYY-MM-DD HH:mm:ss) con horario argentino
     */
    const formatearFechaArgentina = (): string => {
      const ahora = new Date();
      // Convertir a horario de Argentina (GMT-3)
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      
      const partes = formatter.formatToParts(ahora);
      const año = partes.find(p => p.type === 'year')?.value || '2025';
      const mes = partes.find(p => p.type === 'month')?.value || '01';
      const dia = partes.find(p => p.type === 'day')?.value || '01';
      const horas = partes.find(p => p.type === 'hour')?.value || '00';
      const minutos = partes.find(p => p.type === 'minute')?.value || '00';
      const segundos = partes.find(p => p.type === 'second')?.value || '00';
      
      return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
    };
    
    const fechaEntrega = formatearFechaArgentina();

    // 1. Actualizar DetallePedido para cada producto
    const actualizacionesDetalle = data.productos.map((prod) => {
      const updateData: Partial<DetallePedido> = {
        cantidadFinal: prod.cantidadFinal,
        cantidadPesada: prod.necesitaPesar === 1 ? prod.cantidadPesada : undefined,
        // cantidadDevuelta se calcula: cantidad - cantidadFinal
      };
      return this.db.update('DetallePedido', prod.idDetallePedido, updateData);
    });

    // 2. Crear MovimientoStock (esto requiere lógica adicional, por ahora placeholder)
    // TODO: Implementar creación de MovimientoStock

    // 3. Actualizar Pedido (estado a Entregado = 5)
    const updatePedidoData: any = {
      idEstadoPedido: 5, // Estado Entregado
      fechaHoraEntrega: fechaEntrega,
    };
    
    // Agregar observaciones si hay valor (no undefined ni vacío)
    // Si viene undefined, no se agrega al objeto (se mantiene el valor actual en BD)
    // Si viene string (vacío o con contenido), siempre se guarda
    console.log('🔍 Procesando observaciones en servicio:', data.observaciones, 'tipo:', typeof data.observaciones);
    if (data.observaciones !== undefined && data.observaciones !== null) {
      if (typeof data.observaciones === 'string') {
        const observacionesTrim = data.observaciones.trim();
        if (observacionesTrim !== '') {
          updatePedidoData.observaciones = observacionesTrim;
          console.log('✅ Guardando observaciones en Pedido (contenido):', updatePedidoData.observaciones);
        } else {
          // Si viene string vacío, guardar como null en BD
          updatePedidoData.observaciones = null;
          console.log('✅ Limpiando observaciones del Pedido (string vacío -> null)');
        }
      }
    } else {
      console.log('⚠️ Observaciones es undefined/null, no se actualizará el campo observaciones en Pedido');
    }
    console.log('📦 Datos a actualizar en Pedido:', updatePedidoData);
    
    const actualizacionPedido = this.db.update('Pedido', data.idPedido, updatePedidoData);

    // 4. Crear pagos si hay
    // fechaAlta e idUsuarioAlta los maneja el ui-kit automáticamente
    const creacionPagos = data.pagos.length > 0
      ? this.db.createMany('PagoPedido', data.pagos.map(p => ({
          ...p,
          idPedido: data.idPedido,
          fechaPago: p.fechaPago || fechaEntrega, // Usar la fecha que viene del componente o la fechaEntrega
          esActivo: 1,
          // No incluir fechaAlta ni idUsuarioAlta - el ui-kit los agrega automáticamente
        })))
      : of(null);

    // 5. Crear devoluciones si hay (antes desactivar las borrador ya guardadas para este pedido, para no duplicar)
    const creacionDevoluciones = (data.devoluciones && data.devoluciones.length > 0)
      ? this.db.listFull<any>('DevolucionEntrega', {
          filters: [
            { field: 'idPedido', op: 'eq', value: data.idPedido },
            { field: 'esActivo', op: 'eq', value: 1 },
          ],
        }).pipe(
          switchMap((existentes) => {
            const list = existentes ?? [];
            if (list.length === 0) {
              return this.db.createMany('DevolucionEntrega', data.devoluciones!);
            }
            const userId = (this.db as any).getUserId?.() ?? 0;
            const desactivar$ = list.map((d: any) =>
              this.db.deactivate('DevolucionEntrega', d.idDevolucionEntrega, userId)
            );
            return forkJoin(desactivar$).pipe(
              switchMap(() => this.db.createMany('DevolucionEntrega', data.devoluciones!))
            );
          })
        )
      : of(null);

    // 6. Actualizar permitidoEditar del cliente a 0 cuando se confirma la entrega
    // Primero obtener el idCliente del pedido
    const actualizacionPermitidoEditar = this.db.getById<any>('Pedido', data.idPedido, {
      joins: ['Cliente'],
    }).pipe(
      switchMap((pedido) => {
        const idCliente = typeof pedido.idCliente === 'object' 
          ? pedido.idCliente?.idCliente 
          : pedido.idCliente;
        
        if (idCliente) {
          // Actualizar permitidoEditar a 0 para que vendedores/repartidores no puedan editar
          return this.db.update('Cliente', idCliente, { permitidoEditar: 0 });
        }
        return of(null);
      }),
      catchError((err) => {
        console.error('Error al actualizar permitidoEditar del cliente:', err);
        // No fallar la operación completa si esto falla
        return of(null);
      })
    );

    // Ejecutar todas las operaciones en paralelo
    return forkJoin([
      ...actualizacionesDetalle,
      actualizacionPedido,
      creacionPagos,
      creacionDevoluciones,
      actualizacionPermitidoEditar,
    ]).pipe(
      // Después de registrar la entrega, verificar si todos los pedidos de la carga están entregados
      switchMap(() => {
        // Obtener idCarga desde los datos si está disponible y es válido, o buscar en PedidoxCarga
        const idCargaDirecto = data.idCarga && typeof data.idCarga === 'number' && data.idCarga > 0 
          ? data.idCarga 
          : null;
        
        if (idCargaDirecto) {
          return this.verificarYActualizarEstadoCarga(idCargaDirecto).pipe(
            map(() => undefined)
          );
        }
        
        // Si no hay idCarga válido en los datos, buscar desde PedidoxCarga
        return this.db.listFull<any>('PedidoxCarga', {
          filters: [
            { field: 'idPedido', op: 'eq', value: data.idPedido },
            { field: 'esActivo', op: 'eq', value: 1 },
          ],
        }).pipe(
          switchMap((pxc) => {
            if (pxc.length > 0 && pxc[0].idCarga && typeof pxc[0].idCarga === 'number' && pxc[0].idCarga > 0) {
              return this.verificarYActualizarEstadoCarga(pxc[0].idCarga).pipe(
                map(() => undefined)
              );
            }
            return of(undefined);
          })
        );
      })
    );
  }

  /**
   * Verifica si una carga está completamente entregada
   */
  verificarCargaCompleta(idCarga: number): Observable<boolean> {
    return this.getPedidosPorCarga(idCarga, true).pipe(
      map((pedidos) => {
        console.log(`[verificarCargaCompleta] Carga ${idCarga}: ${pedidos.length} pedidos encontrados`);
        if (pedidos.length === 0) {
          console.log(`[verificarCargaCompleta] No hay pedidos en la carga ${idCarga}`);
          return false;
        }
        
        const estados = pedidos.map(p => ({ idPedido: p.idPedido, estado: p.estadoEntrega }));
        console.log(`[verificarCargaCompleta] Estados de pedidos:`, estados);
        
        const todosEntregados = pedidos.every(p => p.estadoEntrega === 'ENTREGADO');
        console.log(`[verificarCargaCompleta] Todos entregados: ${todosEntregados}`);
        
        return todosEntregados;
      })
    );
  }

  /**
   * Verifica si todos los pedidos de una carga están entregados y actualiza el estado de la carga
   * Estado 3 = "Recibida y Entregada"
   */
  verificarYActualizarEstadoCarga(idCarga: number): Observable<void> {
    console.log(`[verificarYActualizarEstadoCarga] Verificando carga ${idCarga}`);
    return this.verificarCargaCompleta(idCarga).pipe(
      switchMap((completa) => {
        console.log(`[verificarYActualizarEstadoCarga] Carga ${idCarga} completa: ${completa}`);
        if (completa) {
          // Actualizar el estado de la carga a 3 (Recibida y Entregada)
          console.log(`[verificarYActualizarEstadoCarga] Actualizando carga ${idCarga} a estado 3 (Recibida y Entregada)`);
          return this.db.update('Carga', idCarga, {
            idEstadoCarga: 3, // Estado "Recibida y Entregada"
          }).pipe(
            map(() => {
              console.log(`[verificarYActualizarEstadoCarga] Carga ${idCarga} actualizada correctamente a estado 3`);
              return undefined;
            })
          );
        }
        console.log(`[verificarYActualizarEstadoCarga] Carga ${idCarga} no está completa, no se actualiza el estado`);
        return of(undefined);
      })
    );
  }

  /**
   * Marca una carga como finalizada
   */
  finalizarCarga(idCarga: number): Observable<void> {
    return this.db.update('Carga', idCarga, {
      // Asumiendo que hay un campo para marcar como finalizada
      // idEstadoCarga: ESTADO_FINALIZADA
    }).pipe(map(() => undefined));
  }
}


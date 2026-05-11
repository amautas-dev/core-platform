import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DbService } from 'ui-kit';
import { ProductosStockService } from './productos-stock.service';
import { ProductosDerivadosService } from './productos-derivados.service';
import { ProductoStock, ProductoDerivadoStock } from '../models/producto.interface';
import { DetallePedidoLote } from '../models/detalle-pedido-lote.interface';
import { DetallePedido } from '../models/detalle-pedido.interface';

export interface DesgloseLote {
  idProductoStock?: number;
  idProductoDerivadoStock?: number;
  cantidad: number;
}

/**
 * Ordena lotes: sin fecha de vencimiento primero, luego los más antiguos (FEFO).
 */
function ordenarLotesPorVencimiento<T extends { fechaVencimiento?: string | null; cantidad?: number }>(
  lotes: T[]
): T[] {
  return [...lotes].sort((a, b) => {
    const va = a.fechaVencimiento;
    const vb = b.fechaVencimiento;
    if (!va && vb) return -1;
    if (va && !vb) return 1;
    if (!va && !vb) return 0;
    return (va || '').localeCompare(vb || '');
  });
}

/** Considera activo si esActivo es 1, '1' o true (misma lógica que productos y paso-productos). */
function esLoteActivo(l: { esActivo?: number | string | boolean }): boolean {
  const v = l.esActivo;
  if (v === 1 || v === true) return true;
  if (typeof v === 'string') return parseInt(v, 10) === 1;
  return (v ?? 0) === 1;
}

@Injectable({ providedIn: 'root' })
export class PedidoStockLotesService {
  private db = inject(DbService);
  private productosStockService = inject(ProductosStockService);
  private derivadosStockService = inject(ProductosDerivadosService);

  /**
   * Descuenta cantidad de lotes (ProductoStock o ProductoDerivadoStock).
   * Usa lotes sin vencimiento o más antiguos primero.
   * Devuelve el desglose para persistir en DetallePedidoLote.
   */
  async descontarCantidad(
    idProducto: number,
    idProductoDerivado: number | null,
    cantidad: number
  ): Promise<DesgloseLote[]> {
    if (cantidad <= 0) return [];

    const esDerivado = idProductoDerivado != null && idProductoDerivado > 0;

    if (esDerivado) {
      const lotes = await firstValueFrom(
        this.derivadosStockService.getStockByDerivado(idProductoDerivado!)
      );
      const activos = (lotes || []).filter(
        (l) => esLoteActivo(l) && (l.cantidad || 0) > 0
      );
      const ordenados = ordenarLotesPorVencimiento(activos);
      return this.descontarDeLotesDerivado(ordenados, cantidad);
    } else {
      const lotes = await firstValueFrom(
        this.productosStockService.getStockByProducto(idProducto)
      );
      const activos = (lotes || []).filter(
        (l) => esLoteActivo(l) && (l.cantidad || 0) > 0
      );
      const ordenados = ordenarLotesPorVencimiento(activos);
      return this.descontarDeLotesProducto(ordenados, cantidad);
    }
  }

  private async descontarDeLotesProducto(
    lotes: ProductoStock[],
    cantidadTotal: number
  ): Promise<DesgloseLote[]> {
    const desglose: DesgloseLote[] = [];
    let restante = cantidadTotal;

    for (const lote of lotes) {
      if (restante <= 0) break;
      const disponible = lote.cantidad || 0;
      if (disponible <= 0) continue;

      const aDescontar = Math.min(restante, disponible);
      const nuevaCantidad = Math.max(0, disponible - aDescontar);

      await firstValueFrom(
        this.productosStockService.updateLoteStock({
          ...lote,
          cantidad: nuevaCantidad,
        })
      );

      desglose.push({
        idProductoStock: lote.idProductoStock,
        cantidad: aDescontar,
      });
      restante -= aDescontar;
    }

    if (restante > 0) {
      throw new Error(
        `Stock insuficiente: faltan ${restante} unidades para el producto`
      );
    }
    return desglose;
  }

  private async descontarDeLotesDerivado(
    lotes: ProductoDerivadoStock[],
    cantidadTotal: number
  ): Promise<DesgloseLote[]> {
    const desglose: DesgloseLote[] = [];
    let restante = cantidadTotal;

    for (const lote of lotes) {
      if (restante <= 0) break;
      const disponible = lote.cantidad || 0;
      if (disponible <= 0) continue;

      const aDescontar = Math.min(restante, disponible);
      const nuevaCantidad = Math.max(0, disponible - aDescontar);

      await firstValueFrom(
        this.derivadosStockService.updateLoteStock({
          ...lote,
          cantidad: nuevaCantidad,
        })
      );

      desglose.push({
        idProductoDerivadoStock: lote.idProductoDerivadoStock,
        cantidad: aDescontar,
      });
      restante -= aDescontar;
    }

    if (restante > 0) {
      throw new Error(
        `Stock insuficiente: faltan ${restante} unidades para el derivado`
      );
    }
    return desglose;
  }

  /**
   * Restaura cantidad en los lotes según el desglose guardado (p. ej. DetallePedidoLote).
   */
  async restaurarCantidad(desglose: DesgloseLote[]): Promise<void> {
    for (const item of desglose) {
      if (item.idProductoStock != null && item.idProductoStock > 0) {
        const lote = await firstValueFrom(
          this.db.getById<ProductoStock>('ProductoStock', item.idProductoStock)
        );
        if (lote) {
          const nuevaCantidad = Number(lote.cantidad ?? 0) + Number(item.cantidad ?? 0);
          await firstValueFrom(
            this.productosStockService.updateLoteStock({
              ...lote,
              cantidad: nuevaCantidad,
            })
          );
        }
      } else if (
        item.idProductoDerivadoStock != null &&
        item.idProductoDerivadoStock > 0
      ) {
        const lote = await firstValueFrom(
          this.db.getById<ProductoDerivadoStock>(
            'ProductoDerivadoStock',
            item.idProductoDerivadoStock
          )
        );
        if (lote) {
          const nuevaCantidad = Number(lote.cantidad ?? 0) + Number(item.cantidad ?? 0);
          await firstValueFrom(
            this.derivadosStockService.updateLoteStock({
              ...lote,
              cantidad: nuevaCantidad,
            })
          );
        }
      }
    }
  }

  /**
   * Obtiene los registros DetallePedidoLote activos para un detalle de pedido.
   */
  getLotesPorDetalle(idDetallePedido: number): Promise<DetallePedidoLote[]> {
    return firstValueFrom(
      this.db.listFull<DetallePedidoLote>('DetallePedidoLote', {
        filters: [
          { field: 'idDetallePedido', op: 'eq', value: idDetallePedido },
          { field: 'esActivo', op: 'eq', value: 1 },
        ],
      })
    ).then((list) => list || []);
  }

  /**
   * Restaura el stock de todos los detalles de un pedido (al deshabilitar/cancelar el pedido).
   * Para cada DetallePedido del pedido, devuelve las cantidades a ProductoStock/ProductoDerivadoStock
   * según DetallePedidoLote y marca esos registros como inactivos.
   */
  async restaurarStockPorPedido(idPedido: number): Promise<void> {
    const detalles = await firstValueFrom(
      this.db.listFull<DetallePedido>('DetallePedido', {
        filters: [{ field: 'idPedido', op: 'eq', value: idPedido }],
      })
    ).then((list) => list || []);

    for (const detalle of detalles) {
      if (detalle?.idDetallePedido) {
        await this.restaurarYLimpiarDetalle(detalle.idDetallePedido);
      }
    }
  }

  /**
   * Persiste el desglose en DetallePedidoLote y opcionalmente elimina registros previos.
   */
  async guardarDesglose(
    idDetallePedido: number,
    desglose: DesgloseLote[]
  ): Promise<void> {
    for (const d of desglose) {
      const payload: Partial<DetallePedidoLote> = {
        idDetallePedido,
        cantidad: d.cantidad,
      };
      if (d.idProductoStock != null)
        payload.idProductoStock = d.idProductoStock;
      if (d.idProductoDerivadoStock != null)
        payload.idProductoDerivadoStock = d.idProductoDerivadoStock;
      await firstValueFrom(this.db.create('DetallePedidoLote', payload));
    }
  }

  /**
   * Restaura solo una parte de la cantidad reservada de un detalle (p. ej. al bajar cantidad 3→1, restaura 2).
   * Devuelve de los lotes en orden LIFO (último reservado, primero devuelto) y actualiza o desactiva los registros DetallePedidoLote.
   */
  async restaurarCantidadParcial(
    idDetallePedido: number,
    cantidadARestaurar: number
  ): Promise<void> {
    if (cantidadARestaurar <= 0) return;
    const registros = await this.getLotesPorDetalle(idDetallePedido);
    if (registros.length === 0) return;
    // LIFO: último reservado primero a devolver (orden inverso por id)
    const ordenados = [...registros].sort(
      (a, b) => (b.idDetallePedidoLote ?? 0) - (a.idDetallePedidoLote ?? 0)
    );
    let restante = cantidadARestaurar;
    const userId = this.db.getUserId() ?? 0;

    for (const r of ordenados) {
      if (restante <= 0) break;
      const cantEnFila = Number(r.cantidad ?? 0);
      if (cantEnFila <= 0) continue;
      const aRestaurar = Math.min(cantEnFila, restante);
      const nuevaCantidadFila = cantEnFila - aRestaurar;

      if (r.idProductoStock != null && r.idProductoStock > 0) {
        const lote = await firstValueFrom(
          this.db.getById<ProductoStock>('ProductoStock', r.idProductoStock)
        );
        if (lote) {
          const nuevaCantidadLote = Number(lote.cantidad ?? 0) + aRestaurar;
          await firstValueFrom(
            this.productosStockService.updateLoteStock({
              ...lote,
              cantidad: nuevaCantidadLote,
            })
          );
        }
      } else if (
        r.idProductoDerivadoStock != null &&
        r.idProductoDerivadoStock > 0
      ) {
        const lote = await firstValueFrom(
          this.db.getById<ProductoDerivadoStock>(
            'ProductoDerivadoStock',
            r.idProductoDerivadoStock
          )
        );
        if (lote) {
          const nuevaCantidadLote = Number(lote.cantidad ?? 0) + aRestaurar;
          await firstValueFrom(
            this.derivadosStockService.updateLoteStock({
              ...lote,
              cantidad: nuevaCantidadLote,
            })
          );
        }
      }

      if (r.idDetallePedidoLote) {
        if (nuevaCantidadFila <= 0) {
          try {
            await firstValueFrom(
              this.db.deactivate('DetallePedidoLote', r.idDetallePedidoLote, userId)
            );
          } catch {
            // Tabla sin soft delete
          }
        } else {
          await firstValueFrom(
            this.db.update('DetallePedidoLote', r.idDetallePedidoLote, {
              cantidad: nuevaCantidadFila,
            })
          );
        }
      }
      restante -= aRestaurar;
    }
  }

  /**
   * Restaura stock para un detalle y elimina sus registros en DetallePedidoLote.
   */
  async restaurarYLimpiarDetalle(idDetallePedido: number): Promise<void> {
    const registros = await this.getLotesPorDetalle(idDetallePedido);
    const desglose: DesgloseLote[] = registros.map((r) => ({
      idProductoStock: r.idProductoStock ?? undefined,
      idProductoDerivadoStock: r.idProductoDerivadoStock ?? undefined,
      cantidad: r.cantidad,
    }));
    await this.restaurarCantidad(desglose);
    const userId = this.db.getUserId() ?? 0;
    for (const r of registros) {
      if (r.idDetallePedidoLote) {
        try {
          await firstValueFrom(
            this.db.deactivate('DetallePedidoLote', r.idDetallePedidoLote, userId)
          );
        } catch {
          // Tabla sin soft delete o API sin deactivate
        }
      }
    }
  }
}

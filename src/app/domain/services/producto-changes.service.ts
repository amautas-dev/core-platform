import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * Servicio para notificar cambios en productos (precios, stock, etc.)
 * Permite que los componentes se actualicen cuando cambian estos valores.
 */
@Injectable({ providedIn: 'root' })
export class ProductoChangesService {
  // Usar BehaviorSubject para mantener el último evento y asegurar que los componentes reciban cambios
  private precioChanged$ = new BehaviorSubject<{
    idProducto?: number;
    idListaPrecio?: number;
  } | null>(null);

  private stockChanged$ = new BehaviorSubject<{
    idProducto?: number;
    idProductoDerivado?: number;
  } | null>(null);

  // Observable público para cambios de precios (filtrar null para evitar eventos iniciales)
  readonly onPrecioChanged = this.precioChanged$.asObservable().pipe(
    filter(change => change !== null)
  );

  // Observable público para cambios de stock (filtrar null para evitar eventos iniciales)
  readonly onStockChanged = this.stockChanged$.asObservable().pipe(
    filter(change => change !== null)
  );

  /**
   * Notifica que cambió el precio de un producto en una lista de precios
   */
  notifyPrecioChanged(idProducto?: number, idListaPrecio?: number): void {
    console.log('📢 ProductoChangesService: notificando cambio de precio', { idProducto, idListaPrecio });
    this.precioChanged$.next({ idProducto, idListaPrecio });
  }

  /**
   * Notifica que cambió el stock de un producto (o derivado)
   */
  notifyStockChanged(idProducto?: number, idProductoDerivado?: number): void {
    console.log('📢 ProductoChangesService: notificando cambio de stock', { idProducto, idProductoDerivado });
    this.stockChanged$.next({ idProducto, idProductoDerivado });
  }

  /**
   * Notifica que cambiaron tanto precios como stock (recarga completa)
   */
  notifyFullRefresh(): void {
    this.precioChanged$.next({});
    this.stockChanged$.next({});
  }
}


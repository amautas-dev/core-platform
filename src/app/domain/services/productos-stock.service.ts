import { Injectable, inject } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

import { DbService } from 'ui-kit';
import { ProductoStock } from '../models/producto.interface';

@Injectable({ providedIn: 'root' })
export class ProductosStockService {
  protected db = inject(DbService);

  // ---------- STOCK POR PRODUCTO ----------

  /** Lotes de stock (incluye inactivos para detectar duplicados) */
  getStockByProducto(
    idProducto: number
  ): Observable<ProductoStock[]> {
    if (!idProducto || idProducto <= 0) {
      console.warn(
        '⛔ getStockByProducto bloqueado, id inválido:',
        idProducto
      );
      return of([]);
    }

    // Traer TODOS los lotes (activos e inactivos) para poder detectar duplicados correctamente
    return this.db.list<ProductoStock>('ProductoStock', {
      filters: [
        { field: 'idProducto', op: 'eq', value: idProducto },
      ],
      orderBy: [{ field: 'fechaVencimiento', dir: 'asc' }],
      includeInactive: true,
    });
  }

  /**
   * Obtiene un lote por ID (para leer cantidad actual antes de sumar/restar).
   */
  getLoteById(idProductoStock: number): Observable<ProductoStock | null> {
    if (!idProductoStock || idProductoStock <= 0) return of(null);
    return this.db.getById<ProductoStock>('ProductoStock', idProductoStock).pipe(
      map((l) => l ?? null),
      catchError(() => of(null))
    );
  }

  /**
   * Actualiza un lote de stock existente (UPDATE simple)
   */
  updateLoteStock(lote: ProductoStock): Observable<ProductoStock> {
    if (!lote.idProductoStock || lote.idProductoStock <= 0) {
      throw new Error('No se puede actualizar un lote sin ID');
    }
    
    const { idProductoStock, ...body } = lote;
    return this.db.update<ProductoStock, ProductoStock>(
      'ProductoStock',
      idProductoStock,
      body
    );
  }

  /**
   * Crea un nuevo lote de stock (CREATE simple)
   */
  createLoteStock(lote: Omit<ProductoStock, 'idProductoStock'>): Observable<ProductoStock> {
    return (this.db.create('ProductoStock', lote) as Observable<number>).pipe(
      map((newId: number) => {
        if (!newId || newId === 0) {
          throw new Error('No se pudo obtener el ID del lote creado');
        }

        const loteCreado: ProductoStock = {
          idProductoStock: newId,
          idProducto: lote.idProducto,
          cantidad: lote.cantidad,
          fechaVencimiento: lote.fechaVencimiento,
          esActivo: lote.esActivo ?? 1,
        };

        return loteCreado;
      })
    );
  }

  /**
   * Busca un lote por fecha de vencimiento (activo o inactivo)
   */
  findLoteByFecha(
    idProducto: number,
    fechaVencimiento: string
  ): Observable<ProductoStock | null> {
    return this.db.list<ProductoStock>('ProductoStock', {
      filters: [
        { field: 'idProducto', op: 'eq', value: idProducto },
        { field: 'fechaVencimiento', op: 'eq', value: fechaVencimiento },
      ],
      includeInactive: true,
    }).pipe(
      map(lotes => lotes && lotes.length > 0 ? lotes[0] : null)
    );
  }

  /**
   * Trae TODO el stock de productos de una vez (optimización para evitar múltiples consultas)
   * Solo trae lotes activos para cálculo de stock
   */
  getAllStock(): Observable<ProductoStock[]> {
    return this.db.list<ProductoStock>('ProductoStock', {
      filters: [
        { field: 'esActivo', op: 'eq', value: 1 },
      ],
      orderBy: [{ field: 'idProducto', dir: 'asc' }, { field: 'fechaVencimiento', dir: 'asc' }],
      includeInactive: false,
    });
  }
}


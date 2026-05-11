// src/app/domain/services/productos-derivados.service.ts
import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { map, Observable, of } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import {
  Producto,
  ProductoDerivado,
  ProductoDerivadoStock,
} from '../../domain/models/producto.interface';

@Injectable({ providedIn: 'root' })
export class ProductosDerivadosService extends BaseDataService<ProductoDerivado> {
  protected entityName = 'ProductoDerivado';
  protected override db = inject(DbService);

  // ---------- PRODUCTO BASE ----------

  getProductos() {
    return this.db.list<Producto>('Producto', {
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      orderBy: [{ field: 'nombreProducto', dir: 'asc' }],
    });
  }

  /** Producto base (por id) */
  getProducto(idProducto: number): Observable<Producto> {
    return this.db.getById<Producto>('Producto', idProducto);
  }

  /** Lista de productos base activos para el combo del diálogo */
  getProductosBase(): Observable<Producto[]> {
    return this.db.list<Producto>('Producto', {
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      orderBy: [{ field: 'nombreProducto', dir: 'asc' }],
    });
  }

  // ---------- DERIVADOS ----------

  /** Derivados de un producto base */
  getDerivadosByProducto(idProducto: number): Observable<ProductoDerivado[]> {
    return this.db
      .list<ProductoDerivado>('ProductoDerivado', {
        filters: [{ field: 'idProducto', op: 'eq', value: idProducto }],
        orderBy: [{ field: 'nombreProductoDerivado', dir: 'asc' }],
      })
      .pipe(
        map((list) =>
          list.map((d) => ({
            ...d,
            idProductoDerivado: Number(d.idProductoDerivado) || 0,
          }))
        )
      );
  }

  /** Alta / modificación de derivado */
  /**
   * Guarda un derivado (create/update) y **SIEMPRE** devuelve
   * un ProductoDerivado con idProductoDerivado definido.
   */
  saveDerivado(data: ProductoDerivado): Observable<ProductoDerivado> {
    // --- UPDATE ---
    if (data.idProductoDerivado && data.idProductoDerivado > 0) {
      const { idProductoDerivado, ...body } = data;

      return this.db.update<typeof body, ProductoDerivado>(
        'ProductoDerivado',
        idProductoDerivado,
        body
      );
    }

    // --- CREATE ---
    const body = {
      idProducto: data.idProducto,
      nombreProductoDerivado: data.nombreProductoDerivado ?? '',
      esActivo: 1,
    };

    // PHP-CRUD-API devuelve sólo el ID (número), lo convertimos a objeto
    return (this.db.create('ProductoDerivado', body) as Observable<number>).pipe(
      map((newId: number) => {
        if (!newId || newId === 0) {
          throw new Error('No se pudo obtener el ID del derivado creado');
        }

        const derivado: ProductoDerivado = {
          idProductoDerivado: newId,
          idProducto: body.idProducto,
          nombreProductoDerivado: body.nombreProductoDerivado,
          esActivo: 1,
        };

        return derivado;
      })
    );
  }

  // ---------- STOCK POR DERIVADO ----------

  /** Lotes de stock (incluye inactivos para detectar duplicados) */
  getStockByDerivado(
    idProductoDerivado: number
  ): Observable<ProductoDerivadoStock[]> {
    // 🔥 Si no hay id válido, DEVOLVEMOS OBSERVABLE PURO (sin pasar por DbService)
    if (!idProductoDerivado || idProductoDerivado <= 0) {
      console.warn(
        '⛔ getStockByDerivado bloqueado, id inválido:',
        idProductoDerivado
      );
      return of([]); // ahora sí funciona, porque no toca DbService
    }

    // 🔥 Si el id es válido, recién ahí llamamos a DbService
    // Traer TODOS los lotes (activos e inactivos) para poder detectar duplicados correctamente
    return this.db.list<ProductoDerivadoStock>('ProductoDerivadoStock', {
      filters: [
        { field: 'idProductoDerivado', op: 'eq', value: idProductoDerivado },
      ],
      orderBy: [{ field: 'fechaVencimiento', dir: 'asc' }],
      includeInactive: true,
    });
  }

  /** Lotes de stock (incluyendo inactivos) - para verificar duplicados */
  getStockByDerivadoIncluyendoInactivos(
    idProductoDerivado: number
  ): Observable<ProductoDerivadoStock[]> {
    // 🔥 Si no hay id válido, DEVOLVEMOS OBSERVABLE PURO (sin pasar por DbService)
    if (!idProductoDerivado || idProductoDerivado <= 0) {
      console.warn(
        '⛔ getStockByDerivadoIncluyendoInactivos bloqueado, id inválido:',
        idProductoDerivado
      );
      return of([]);
    }

    console.log('🔍 getStockByDerivadoIncluyendoInactivos - idProductoDerivado:', idProductoDerivado);

    // Traer TODOS los lotes (activos e inactivos)
    return this.db.list<ProductoDerivadoStock>('ProductoDerivadoStock', {
      filters: [
        { field: 'idProductoDerivado', op: 'eq', value: idProductoDerivado },
      ],
      orderBy: [{ field: 'fechaVencimiento', dir: 'asc' }],
      includeInactive: true,
    }).pipe(
      map((lotes) => {
        console.log('🔍 getStockByDerivadoIncluyendoInactivos - lotes recibidos:', lotes?.length || 0);
        return lotes || [];
      })
    );
  }

  /**
   * Actualiza un lote de stock existente (UPDATE simple)
   */
  updateLoteStock(lote: ProductoDerivadoStock): Observable<ProductoDerivadoStock> {
    if (!lote.idProductoDerivadoStock || lote.idProductoDerivadoStock <= 0) {
      throw new Error('No se puede actualizar un lote sin ID');
    }
    
    const { idProductoDerivadoStock, ...body } = lote;
    return this.db.update<ProductoDerivadoStock, ProductoDerivadoStock>(
      'ProductoDerivadoStock',
      idProductoDerivadoStock,
      body
    );
  }

  /**
   * Crea un nuevo lote de stock (CREATE simple)
   */
  createLoteStock(lote: Omit<ProductoDerivadoStock, 'idProductoDerivadoStock'>): Observable<ProductoDerivadoStock> {
    // PHP-CRUD-API devuelve sólo el ID (número), lo convertimos a objeto
    return (this.db.create('ProductoDerivadoStock', lote) as Observable<number>).pipe(
      map((newId: number) => {
        if (!newId || newId === 0) {
          throw new Error('No se pudo obtener el ID del lote creado');
        }

        const loteCreado: ProductoDerivadoStock = {
          idProductoDerivadoStock: newId,
          idProductoDerivado: lote.idProductoDerivado,
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
    idProductoDerivado: number,
    fechaVencimiento: string
  ): Observable<ProductoDerivadoStock | null> {
    return this.db.list<ProductoDerivadoStock>('ProductoDerivadoStock', {
      filters: [
        { field: 'idProductoDerivado', op: 'eq', value: idProductoDerivado },
        { field: 'fechaVencimiento', op: 'eq', value: fechaVencimiento },
      ],
      includeInactive: true,
    }).pipe(
      map(lotes => lotes && lotes.length > 0 ? lotes[0] : null)
    );
  }

  /**
   * Sincroniza lotes de stock de un derivado usando syncSmart.
   * uniqueField = fechaVencimiento (puede cambiarse si lo necesitás).
   * 
   * IMPORTANTE: Cada objeto en el array debe incluir idProductoDerivado,
   * siguiendo el mismo patrón que zonas.component.ts y listas-precios.service.ts
   */
  syncStockDerivado(
    idProductoDerivado: number,
    lotes: ProductoDerivadoStock[]
  ) {
    // Construir objetos limpios: SIEMPRE incluir idProductoDerivado en cada uno
    // (syncSmart lo requiere en cada elemento del array, no solo como parámetro)
    const clean: any[] = lotes.map((l) => {
      // Construir objeto base con TODOS los campos requeridos
      const base: any = {
        idProductoDerivado: idProductoDerivado, // 👈 CRÍTICO: debe estar en cada objeto
        cantidad: l.cantidad || 0,
        fechaVencimiento: l.fechaVencimiento || null,
        esActivo: l.esActivo ?? 1,
      };

      // Solo incluir idProductoDerivadoStock si existe y es > 0 (registro existente para UPDATE)
      // Para nuevos registros (CREATE), NO incluir este campo (es auto-increment)
      if (l.idProductoDerivadoStock && l.idProductoDerivadoStock > 0) {
        base['idProductoDerivadoStock'] = l.idProductoDerivadoStock;
      }

      return base;
    });

    // Debug: verificar que idProductoDerivado esté presente en TODOS los objetos
    console.log('🔍 syncStockDerivado - idProductoDerivado:', idProductoDerivado);
    console.log('🔍 syncStockDerivado - clean array:', JSON.stringify(clean, null, 2));
    console.log('🔍 syncStockDerivado - verificación:', clean.every(l => l.idProductoDerivado === idProductoDerivado));

    return this.db.syncSmart<any>(
      'ProductoDerivadoStock',
      'idProductoDerivado',
      idProductoDerivado,
      clean,
      'fechaVencimiento'
    );
  }

  /**
   * Trae TODOS los derivados de una vez (optimización para evitar múltiples consultas)
   */
  getAllDerivados(): Observable<ProductoDerivado[]> {
    return this.db.list<ProductoDerivado>('ProductoDerivado', {
      orderBy: [{ field: 'idProducto', dir: 'asc' }, { field: 'nombreProductoDerivado', dir: 'asc' }],
    }).pipe(
      map((list) =>
        list.map((d) => ({
          ...d,
          idProductoDerivado: Number(d.idProductoDerivado) || 0,
        }))
      )
    );
  }

  /**
   * Trae TODO el stock de derivados de una vez (optimización para evitar múltiples consultas)
   * Solo trae lotes activos para cálculo de stock
   */
  getAllDerivadoStock(): Observable<ProductoDerivadoStock[]> {
    return this.db.list<ProductoDerivadoStock>('ProductoDerivadoStock', {
      filters: [
        { field: 'esActivo', op: 'eq', value: 1 },
      ],
      orderBy: [{ field: 'idProductoDerivado', dir: 'asc' }, { field: 'fechaVencimiento', dir: 'asc' }],
      includeInactive: false,
    });
  }
}

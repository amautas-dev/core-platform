import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, map, firstValueFrom, of } from 'rxjs';
import { NoComercial } from '../../domain/models/productos-no-comercial.interface';

@Injectable({ providedIn: 'root' })
export class AdminProductosNoComService {
  private db = inject(DbService);

  // --- DATA BASE ---
  getZonas() {
    return this.db.list('Zona', { orderBy: [{ field: 'nombreZona' }] });
  }

  getProductos() {
    return this.db.list('Producto', {
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      orderBy: [{ field: 'nombreProducto', dir: 'asc' }],
    }).pipe(
      map((productos: any[]) => {
        // Eliminar duplicados basándose en idProducto
        const productosUnicos = new Map<number, any>();
        productos.forEach((p: any) => {
          if (p.idProducto && !productosUnicos.has(p.idProducto)) {
            productosUnicos.set(p.idProducto, p);
          }
        });
        return Array.from(productosUnicos.values());
      })
    );
  }

  getMarcas() {
    return this.db.list('Marca', {
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      orderBy: [{ field: 'nombreMarca', dir: 'asc' }],
    }).pipe(
      map((marcas: any[]) => {
        // Eliminar duplicados basándose en idMarca
        const marcasUnicas = new Map<number, any>();
        marcas.forEach((m: any) => {
          if (m.idMarca && !marcasUnicas.has(m.idMarca)) {
            marcasUnicas.set(m.idMarca, m);
          }
        });
        return Array.from(marcasUnicas.values());
      })
    );
  }

  getNoComercialesPorZona(idZona: number) {
    return this.db.list<NoComercial>('ProductoNoComercialZona', {
      filters: [{ field: 'idZona', op: 'eq', value: idZona }],
      includeInactive: true,
    });
  }

  // --- SYNC CENTRAL ---
  syncNoComerciales(
    idZona: number,
    tipo: 'producto' | 'marca',
    seleccionados: number[]
  ): Observable<{ success: boolean }> {
    const tabla = 'ProductoNoComercialZona';
    
    // Usar from para convertir la Promise en Observable
    return new Observable(observer => {
      (async () => {
        try {
          // Obtener todos los registros existentes de esta zona (para preservar el otro tipo)
          const existentes = await firstValueFrom(
            this.db.list<NoComercial>(tabla, {
              filters: [{ field: 'idZona', op: 'eq', value: idZona }],
              includeInactive: true,
            })
          );

          // Separar los registros del tipo que estamos sincronizando y los del otro tipo
          const registrosDelOtroTipo = existentes.filter((r: any) => {
            if (tipo === 'producto') {
              // Preservar registros de marcas (idMarca no es null)
              return r.idMarca != null && r.idMarca !== null;
            } else {
              // Preservar registros de productos (idProducto no es null)
              return r.idProducto != null && r.idProducto !== null;
            }
          });

          // Crear los nuevos registros del tipo que estamos sincronizando
          const nuevosRegistros = seleccionados.map((id) => ({
            idZona,
            idProducto: tipo === 'producto' ? id : null,
            idMarca: tipo === 'marca' ? id : null,
            esActivo: 1,
          }));

          // Primero, desactivar todos los registros del tipo que estamos sincronizando
          const registrosDelTipoActual = existentes.filter((r: any) => {
            if (tipo === 'producto') {
              return r.idProducto != null && r.idProducto !== null;
            } else {
              return r.idMarca != null && r.idMarca !== null;
            }
          });

          // Desactivar los que no están en la nueva lista
          const idsSeleccionados = new Set(seleccionados);
          for (const registro of registrosDelTipoActual) {
            const id = tipo === 'producto' ? registro.idProducto : registro.idMarca;
            if (id != null && !idsSeleccionados.has(Number(id))) {
              // Desactivar este registro
              await firstValueFrom(
                this.db.update(tabla, registro.idProductoNoComercialZona, { esActivo: 0 }, false)
              );
            }
          }

          // Crear o activar los nuevos registros
          for (const nuevo of nuevosRegistros) {
            // Buscar si ya existe
            const existente = existentes.find((r: any) => {
              if (tipo === 'producto') {
                return r.idZona === idZona && r.idProducto === nuevo.idProducto;
              } else {
                return r.idZona === idZona && r.idMarca === nuevo.idMarca;
              }
            });

            if (existente) {
              // Actualizar a activo
              await firstValueFrom(
                this.db.update(tabla, existente.idProductoNoComercialZona, { esActivo: 1 }, false)
              );
            } else {
              // Crear nuevo
              await firstValueFrom(this.db.create(tabla, nuevo));
            }
          }

          observer.next({ success: true });
          observer.complete();
        } catch (error) {
          observer.error(error);
        }
      })();
    });
  }
}

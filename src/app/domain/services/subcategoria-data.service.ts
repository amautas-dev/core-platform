import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { SubCategoria } from '../../domain/models/subcategoria.interface';

@Injectable({ providedIn: 'root' })
export class SubCategoriaDataService extends BaseDataService<SubCategoria> {
  protected entityName = 'SubCategoria';
  protected override db = inject(DbService);

  /**
   * Lista todas las subcategorías incluyendo inactivas, con join a Categoria.
   */
  list(): Observable<SubCategoria[]> {
    return this.getAllIncludingDeleted({
      joins: ['Categoria'],
      orderBy: [
        { field: 'Categoria.nombreCategoria', dir: 'asc' },
        { field: 'SubCategoria.ordenSubCategoria', dir: 'asc' },
      ],
    }).pipe(
      map((rows) =>
        rows.map((r: any) => ({
          ...r,
          categoria: r.idCategoria
            ? { nombreCategoria: r.idCategoria.nombreCategoria }
            : null,
        }))
      )
    );
  }

  /**
   * Crea una nueva subcategoría.
   * Retorna el ID de la subcategoría creada.
   * Mantiene compatibilidad con código existente.
   */
  create(data: Partial<SubCategoria>): Observable<number> {
    return this.db.create('SubCategoria', data) as Observable<number>;
  }

  /**
   * Actualiza una subcategoría.
   * Mantiene compatibilidad con código existente.
   */
  update(id: number, data: Partial<SubCategoria>): Observable<void> {
    return this.db.update('SubCategoria', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva una subcategoría (soft delete).
   * Usa el método base delete.
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva una subcategoría previamente desactivada.
   * Mantiene compatibilidad con código existente.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('SubCategoria', id).pipe(map(() => undefined));
  }
}

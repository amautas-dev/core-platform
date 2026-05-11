import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { Categoria } from '../../domain/models/categoria.interface';

@Injectable({ providedIn: 'root' })
export class CategoriaDataService extends BaseDataService<Categoria> {
  protected entityName = 'Categoria';
  protected override db = inject(DbService);

  /**
   * Lista todas las categorías incluyendo inactivas, ordenadas por orden y nombre.
   */
  list(): Observable<Categoria[]> {
    return this.getAllIncludingDeleted({
      orderBy: [
        { field: 'ordenCategoria', dir: 'asc' },
        { field: 'nombreCategoria', dir: 'asc' },
      ],
    });
  }

  /**
   * Crea una nueva categoría.
   * Retorna el ID de la categoría creada.
   * Mantiene compatibilidad con código existente.
   */
  create(data: Partial<Categoria>): Observable<number> {
    return this.db.create('Categoria', data) as Observable<number>;
  }

  /**
   * Actualiza una categoría.
   * Mantiene compatibilidad con código existente.
   */
  update(id: number, data: Partial<Categoria>): Observable<void> {
    return this.db.update('Categoria', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva una categoría (soft delete).
   * Usa el método base delete.
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva una categoría previamente desactivada.
   * Mantiene compatibilidad con código existente.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('Categoria', id).pipe(map(() => undefined));
  }
}

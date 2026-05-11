import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { Marca } from '../../domain/models/marca.interface';

@Injectable({ providedIn: 'root' })
export class MarcaDataService extends BaseDataService<Marca> {
  protected entityName = 'Marca';
  protected override db = inject(DbService);

  /**
   * Lista todas las marcas incluyendo inactivas, ordenadas por nombre.
   */
  list(): Observable<Marca[]> {
    return this.getAllIncludingDeleted({
      orderBy: [{ field: 'nombreMarca', dir: 'asc' }],
    });
  }

  /**
   * Crea una nueva marca.
   * Retorna el ID de la marca creada.
   * Mantiene compatibilidad con código existente.
   */
  create(data: Partial<Marca>): Observable<number> {
    return this.db.create('Marca', data) as Observable<number>;
  }

  /**
   * Actualiza una marca.
   * Mantiene compatibilidad con código existente.
   */
  update(id: number, data: Partial<Marca>): Observable<void> {
    return this.db.update('Marca', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva una marca (soft delete).
   * Usa el método base delete.
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva una marca previamente desactivada.
   * Mantiene compatibilidad con código existente.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('Marca', id).pipe(map(() => undefined));
  }
}

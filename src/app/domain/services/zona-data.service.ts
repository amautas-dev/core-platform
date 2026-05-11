import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { Zona, ZonaResumen } from '../../domain/models/zona.interface';

@Injectable({ providedIn: 'root' })
export class ZonaDataService extends BaseDataService<Zona> {
  protected entityName = 'Zona';
  protected override db = inject(DbService);

  /**
   * Obtiene un resumen de zonas (solo id y nombre).
   */
  getZonas(): Observable<Zona[]> {
    return this.getAll({
      select: ['idZona', 'nombreZona', 'numZona'],
      orderBy: [{ field: 'numZona', dir: 'asc' }],
    });
  }

  /**
   * Lista todas las zonas incluyendo inactivas, ordenadas por número y nombre.
   */
  list(): Observable<Zona[]> {
    return this.getAllIncludingDeleted({
      orderBy: [
        { field: 'numZona', dir: 'asc' },
        { field: 'nombreZona', dir: 'asc' },
      ],
    });
  }

  /**
   * Crea una nueva zona.
   * Retorna el ID de la zona creada.
   * Mantiene compatibilidad con código existente.
   */
  create(data: Partial<Zona>): Observable<number> {
    return this.db.create('Zona', data) as Observable<number>;
  }

  /**
   * Actualiza una zona.
   * Mantiene compatibilidad con código existente.
   */
  update(id: number, data: Partial<Zona>): Observable<void> {
    return this.db.update('Zona', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva una zona (soft delete).
   * Usa el método base delete.
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva una zona previamente desactivada.
   * Mantiene compatibilidad con código existente.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('Zona', id).pipe(map(() => undefined));
  }
}

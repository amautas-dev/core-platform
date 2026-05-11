import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { DbService, BaseDataService } from 'ui-kit';
import { RolDTO, RolResumen } from '../../domain/models/_common/rol.interface';

@Injectable({ providedIn: 'root' })
export class RolDataService extends BaseDataService<RolDTO> {
  protected entityName = 'Rol';
  protected override db = inject(DbService);

  /**
   * Obtiene todos los roles activos como resumen (solo id y nombre).
   */
  getRoles(): Observable<RolResumen[]> {
    return this.getAll({
      filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      orderBy: [{ field: 'idRol', dir: 'asc' }],
    }).pipe(
      map((roles) =>
        roles.map((r: any) => ({
          idRol: r.idRol,
          nombreRol: r.nombreRol,
        }))
      )
    );
  }

  /**
   * Lista todos los roles incluyendo inactivos, ordenados por ID.
   */
  list(): Observable<RolDTO[]> {
    return this.getAllIncludingDeleted({
      orderBy: [{ field: 'idRol', dir: 'asc' }],
    });
  }

  /**
   * Crea un nuevo rol.
   * Retorna el ID del rol creado.
   */
  create(data: Partial<RolDTO>): Observable<number> {
    return this.db.create('Rol', data) as Observable<number>;
  }

  /**
   * Actualiza un rol existente.
   */
  update(id: number, data: Partial<RolDTO>): Observable<void> {
    return this.db.update('Rol', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva un rol (soft delete).
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva un rol previamente desactivado.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('Rol', id).pipe(map(() => undefined));
  }
}

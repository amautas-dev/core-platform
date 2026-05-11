import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { Proveedor } from '../models/proveedor.interface';

@Injectable({ providedIn: 'root' })
export class ProveedorDataService extends BaseDataService<Proveedor> {
  protected entityName = 'Proveedor';
  protected override db = inject(DbService);

  /**
   * Lista todos los proveedores incluyendo inactivos, ordenados por nombre.
   */
  list(): Observable<Proveedor[]> {
    return this.getAllIncludingDeleted({
      orderBy: [{ field: 'nombreProveedor', dir: 'asc' }],
    });
  }

  /**
   * Lista solo proveedores activos, ordenados por nombre.
   */
  listActivos(): Observable<Proveedor[]> {
    return this.getAll({
      orderBy: [{ field: 'nombreProveedor', dir: 'asc' }],
    });
  }

  /**
   * Crea un nuevo proveedor.
   * Retorna el ID del proveedor creado.
   */
  create(data: Partial<Proveedor>): Observable<number> {
    return this.db.create('Proveedor', data) as Observable<number>;
  }

  /**
   * Actualiza un proveedor.
   */
  update(id: number, data: Partial<Proveedor>): Observable<void> {
    return this.db.update('Proveedor', id, data).pipe(map(() => undefined));
  }

  /**
   * Desactiva un proveedor (soft delete).
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva un proveedor previamente desactivado.
   */
  reactivate(id: number): Observable<void> {
    return this.db.reactivate('Proveedor', id).pipe(map(() => undefined));
  }
}


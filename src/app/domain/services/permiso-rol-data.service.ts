import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { PermisoRol } from '../../domain/models/_common/permiso-rol.interface';

@Injectable({ providedIn: 'root' })
export class PermisoRolDataService extends BaseDataService<PermisoRol> {
  protected entityName = 'PermisoRol';

  /**
   * Lista todos los permisos con join a Funcionalidad.
   */
  override getAll(): Observable<PermisoRol[]> {
    return super.getAll({
      joins: ['Funcionalidad'],
    });
  }

  /**
   * Crea un permiso nuevo.
   */
  crear(data: Partial<PermisoRol>): Observable<PermisoRol> {
    return this.createEntity(data);
  }

  /**
   * Actualiza un permiso existente.
   */
  actualizar(idPermisoRol: number, data: Partial<PermisoRol>): Observable<PermisoRol> {
    return this.updateEntity(idPermisoRol, data);
  }

  /**
   * Desactiva un permiso (soft delete).
   */
  desactivar(idPermisoRol: number): Observable<any> {
    return this.delete(idPermisoRol);
  }
}

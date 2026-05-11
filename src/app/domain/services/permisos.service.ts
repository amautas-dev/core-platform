import { Injectable } from '@angular/core';
import { forkJoin, map, Observable } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { PermisoRol } from '../../domain/models/_common/permiso-rol.interface';
import { Funcionalidad } from '../../domain/models/_common/funcionalidad.interface';

@Injectable({ providedIn: 'root' })
export class PermisosService extends BaseDataService<PermisoRol> {
  protected entityName = 'PermisoRol';

  /**
   * Obtiene los permisos del rol desde la base (join con Funcionalidad).
   * Para el rol 5, combina los permisos de los roles 3 y 4 (unión lógica).
   */
  getPermisosPorRol(idRol: number): Observable<PermisoRol[]> {
    // Si es el rol 5, combinar permisos de los roles 3 y 4
    if (idRol === 5) {
      return forkJoin({
        permisosRol3: super.getAll({
          joins: ['Funcionalidad'],
          filters: [{ field: 'idRol', op: 'eq', value: 3 }],
        }),
        permisosRol4: super.getAll({
          joins: ['Funcionalidad'],
          filters: [{ field: 'idRol', op: 'eq', value: 4 }],
        }),
      }).pipe(
        map(({ permisosRol3, permisosRol4 }) => {
          // Combinar permisos: unión lógica (OR) de los permisos de los roles 3 y 4
          const permisosCombinados = this.combinarPermisos(permisosRol3, permisosRol4, idRol);
          return permisosCombinados;
        })
      );
    }

    // Para otros roles, consulta normal
    return super.getAll({
      joins: ['Funcionalidad'],
      filters: [{ field: 'idRol', op: 'eq', value: idRol }],
    });
  }

  /**
   * Combina los permisos de dos roles aplicando unión lógica (OR).
   * Si alguno de los roles tiene un permiso, el rol combinado también lo tiene.
   */
  private combinarPermisos(
    permisosRol1: PermisoRol[],
    permisosRol2: PermisoRol[],
    idRolDestino: number
  ): PermisoRol[] {
    const permisosMap = new Map<number, PermisoRol>();

    // Procesar permisos del rol 1
    for (const permiso of permisosRol1) {
      const idFunc = this.getIdFuncionalidad(permiso);
      if (!permisosMap.has(idFunc)) {
        permisosMap.set(idFunc, this.crearPermisoCombinado(permiso, idRolDestino));
      } else {
        const existente = permisosMap.get(idFunc)!;
        permisosMap.set(idFunc, this.mergePermisos(existente, permiso));
      }
    }

    // Procesar permisos del rol 2 y combinar
    for (const permiso of permisosRol2) {
      const idFunc = this.getIdFuncionalidad(permiso);
      if (!permisosMap.has(idFunc)) {
        permisosMap.set(idFunc, this.crearPermisoCombinado(permiso, idRolDestino));
      } else {
        const existente = permisosMap.get(idFunc)!;
        permisosMap.set(idFunc, this.mergePermisos(existente, permiso));
      }
    }

    return Array.from(permisosMap.values());
  }

  /**
   * Obtiene el ID de funcionalidad de un permiso
   */
  private getIdFuncionalidad(permiso: PermisoRol): number {
    return typeof permiso.idFuncionalidad === 'object'
      ? permiso.idFuncionalidad.idFuncionalidad
      : permiso.idFuncionalidad;
  }

  /**
   * Crea un permiso combinado con el idRol de destino
   */
  private crearPermisoCombinado(permiso: PermisoRol, idRolDestino: number): PermisoRol {
    return {
      ...permiso,
      idRol: idRolDestino,
      // Mantener idPermisoRol como 0 ya que es un permiso virtual combinado
      idPermisoRol: 0,
    };
  }

  /**
   * Combina dos permisos aplicando unión lógica (OR)
   */
  private mergePermisos(permiso1: PermisoRol, permiso2: PermisoRol): PermisoRol {
    return {
      ...permiso1,
      puedeVer: permiso1.puedeVer || permiso2.puedeVer,
      puedeEditar: permiso1.puedeEditar || permiso2.puedeEditar,
      puedeBorrar: permiso1.puedeBorrar || permiso2.puedeBorrar,
      esActivo: permiso1.esActivo && permiso2.esActivo, // Solo activo si ambos están activos
    };
  }

  /**
   * Devuelve las funcionalidades visibles (puedeVer=1).
   */
  getFuncionalidadesPermitidas(idRol: number): Observable<Funcionalidad[]> {
    return this.getPermisosPorRol(idRol).pipe(
      map((permisos) =>
        permisos
          .filter((p) => p.puedeVer && typeof p.idFuncionalidad === 'object')
          .map((p) => p.idFuncionalidad as Funcionalidad)
          .sort((a, b) => a.orden - b.orden)
      )
    );
  }
}

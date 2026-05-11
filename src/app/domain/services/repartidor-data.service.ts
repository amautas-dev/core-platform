import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, map, of, switchMap } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { Repartidor, RepartidorTabla } from '../../domain/models/repartidor.interface';

@Injectable({ providedIn: 'root' })
export class RepartidorDataService extends BaseDataService<Repartidor> {
  protected entityName = 'Repartidor';
  protected override db = inject(DbService);

  /**
   * Crea un nuevo repartidor.
   */
  crearRepartidor(dto: Partial<Repartidor>): Observable<any> {
    return this.createEntity(dto);
  }

  /**
   * Actualiza un repartidor existente.
   */
  actualizarRepartidor(id: number, dto: Partial<Repartidor>): Observable<any> {
    return this.updateEntity(id, dto, false);
  }

  /**
   * Desactiva un repartidor (soft delete).
   */
  desactivarRepartidor(id: number): Observable<any> {
    return this.delete(id);
  }

  /**
   * Activa un repartidor previamente desactivado.
   */
  activarRepartidor(id: number): Observable<any> {
    return this.reactivateEntity(id);
  }

  /**
   * Reactiva un repartidor por su ID de usuario.
   */
  reactivarRepartidorPorUsuario(idUsuario: number): Observable<any> {
    return this.getAll({
      filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
    }).pipe(
      switchMap((res) =>
        res.length
          ? this.reactivateEntity(res[0].idRepartidor)
          : of(null)
      )
    );
  }

  /**
   * Desactiva un repartidor por su ID de usuario.
   */
  desactivarRepartidorPorUsuario(idUsuario: number): Observable<any> {
    return this.getAll({
      filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
    }).pipe(
      switchMap((res) =>
        res.length
          ? this.delete(res[0].idRepartidor)
          : of(null)
      )
    );
  }

  /**
   * Obtiene repartidores formateados para tabla.
   */
  getRepartidoresTabla(): Observable<RepartidorTabla[]> {
    return this.db
      .listFull<any>('Repartidor', {
        joins: ['Usuario.Persona'],
        filters: [],
      })
      .pipe(
        map((repartidores) =>
          repartidores.map((r) => ({
            id: r.idRepartidor,
            idUsuario: r.idUsuario?.idUsuario ?? r.idUsuario ?? 0,
            nombreCompleto: `${r.idUsuario?.idPersona?.nombre ?? ''} ${
              r.idUsuario?.idPersona?.apellido ?? ''
            }`,
            fechaIngreso: r.fechaIngreso,
            salarioMensual: r.salarioMensual ?? null,
            estado: r.esActivo ? 'Activo' : 'Inactivo',
            estadoColor: r.esActivo ? 'activo' : 'inactivo',

            // ➕ nuevos campos representativos
            dni: r.idUsuario?.idPersona?.dni ?? '',
            email: r.idUsuario?.idPersona?.email ?? '',
            telefono: r.idUsuario?.idPersona?.telefono ?? '',
            usuario: r.idUsuario?.usuario ?? '',
            fechaAlta: r.fechaAlta ?? null,
          }))
        )
      );
  }
}

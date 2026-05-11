import { Injectable, inject } from '@angular/core';
import { map, Observable } from 'rxjs';
import { DbService } from 'ui-kit';
import { BaseDataService } from 'ui-kit';
import { Carga } from '../../domain/models/carga.interface';

@Injectable({ providedIn: 'root' })
export class CargaDataService extends BaseDataService<Carga> {
  protected entityName = 'Carga';
  protected override db = inject(DbService);

  /**
   * Lista todas las cargas incluyendo inactivas, con transformación de datos.
   */
  list(): Observable<Carga[]> {
    return this.getAllIncludingDeleted({
      joins: ['Usuario.Rol', 'EstadoCarga', 'CargaxZona.Zona'],
      orderBy: [{ field: 'idCarga', dir: 'desc' }],
    }).pipe(
      map((rows: any[]) =>
        rows.map((r) => {
          const encargado = r.idEncargado ?? null;
          const rol = encargado?.idRol ?? null;
          const estado = r.idEstadoCarga ?? null;
          const zonas = (r.CargaxZona ?? [])
            .map((cz: any) => cz.idZona?.nombreZona)
            .filter(Boolean);

          return {
            idCarga: r.idCarga,
            encargado: {
              nombre: encargado?.usuario ?? '-',
              rol: rol?.nombreRol ?? '-',
            },
            estado: estado?.nombreEstadoCarga ?? '-',
            zonas,
            fechaAlta: r.fechaAlta,
            esActivo: r.esActivo,
          };
        })
      )
    );
  }

  /**
   * Obtiene una carga por ID con transformación de datos.
   */
  override getById(id: number): Observable<Carga> {
    return super.getById(id, {
      joins: ['idEncargado.idRol', 'idEstadoCarga', 'CargaxZona.idZona'],
    }).pipe(
      map((r: any) => {
        const encargado = r.idEncargado ?? {};
        const rol = encargado.idRol ?? {};
        const estado = r.idEstadoCarga ?? {};
        const zonas = (r.CargaxZona ?? [])
          .map((cz: any) => cz.idZona?.nombreZona)
          .filter(Boolean);

        return {
          idCarga: r.idCarga,
          encargado: {
            nombre: encargado.usuario || '-',
            rol: rol.nombreRol || '-',
          },
          estado: estado.nombreEstadoCarga || '-',
          zonas,
          fechaAlta: r.fechaAlta,
          esActivo: r.esActivo,
        };
      })
    );
  }

  /**
   * Crea una nueva carga.
   * Retorna el ID de la carga creada.
   */
  create(data: Partial<Carga>): Observable<number> {
    return this.db.create('Carga', data) as Observable<number>;
  }

  /**
   * Actualiza una carga.
   */
  update(id: number, data: Partial<Carga>): Observable<void> {
    return this.updateEntity(id, data, true).pipe(map(() => undefined));
  }

  /**
   * Desactiva una carga (soft delete).
   */
  deactivate(id: number): Observable<void> {
    return this.delete(id);
  }

  /**
   * Reactiva una carga previamente desactivada.
   */
  reactivate(id: number): Observable<void> {
    return this.reactivateEntity(id).pipe(map(() => undefined));
  }

  /**
   * Revierte una carga usando un stored procedure.
   */
  revert(idCarga: number): Observable<any> {
    const idUsuario = this.db.getUserId() ?? 0;
    return this.db.call('sp_revertirCarga', {
      idCarga,
      idUsuario,
    }).pipe(
      map((result: any) => {
        // Extraer el primer resultset si hay múltiples
        if (Array.isArray(result) && result.length > 0 && Array.isArray(result[0])) {
          return result[0];
        }
        return result;
      })
    );
  }
}

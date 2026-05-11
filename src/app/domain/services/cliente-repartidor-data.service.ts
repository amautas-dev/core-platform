import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map, of } from 'rxjs';
import { BaseDataService, DbService } from 'ui-kit';
import { ClienteRepartidor } from '../../domain/models/cliente-repartidor.interface';

@Injectable({ providedIn: 'root' })
export class ClienteRepartidorDataService extends BaseDataService<ClienteRepartidor> {
  protected entityName = 'ClienteRepartidor';
  protected override db = inject(DbService);

  /**
   * Obtiene todas las relaciones cliente-repartidor.
   */
  override getAll(): Observable<ClienteRepartidor[]> {
    return super.getAll();
  }

  /**
   * Obtiene las relaciones por cliente.
   */
  getByCliente(idCliente: number): Observable<ClienteRepartidor[]> {
    return super.getAll({
      filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
    });
  }

  /**
   * Obtiene las relaciones por repartidor.
   */
  getByRepartidor(idRepartidor: number): Observable<ClienteRepartidor[]> {
    return super.getAll({
      filters: [{ field: 'idRepartidor', op: 'eq', value: idRepartidor }],
    });
  }

  /**
   * Sincroniza las relaciones cliente-repartidor usando syncSmart.
   * @param idRepartidor ID del repartidor
   * @param clientes Array de IDs de clientes a asignar
   */
  syncClientes(idRepartidor: number, clientes: number[]): Observable<any> {
    const relaciones = clientes.map((idCliente) => ({
      idRepartidor,
      idCliente,
      esActivo: 1,
    }));

    return this.db.syncSmart(
      'ClienteRepartidor',
      'idRepartidor',
      idRepartidor,
      relaciones,
      'idCliente'
    );
  }
}


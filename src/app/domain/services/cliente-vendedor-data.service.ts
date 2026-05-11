import { Injectable, inject } from '@angular/core';
import { Observable, switchMap, map, of } from 'rxjs';
import { BaseDataService, DbService } from 'ui-kit';
import { ClienteVendedor } from '../../domain/models/cliente-vendedor.interface';

@Injectable({ providedIn: 'root' })
export class ClienteVendedorDataService extends BaseDataService<ClienteVendedor> {
  protected entityName = 'ClienteVendedor';
  protected override db = inject(DbService);

  /**
   * Obtiene todas las relaciones cliente-vendedor.
   */
  override getAll(): Observable<ClienteVendedor[]> {
    return super.getAll();
  }

  /**
   * Obtiene las relaciones por cliente.
   */
  getByCliente(idCliente: number): Observable<ClienteVendedor[]> {
    return super.getAll({
      filters: [{ field: 'idCliente', op: 'eq', value: idCliente }],
    });
  }

  /**
   * Obtiene las relaciones por vendedor.
   */
  getByVendedor(idVendedor: number): Observable<ClienteVendedor[]> {
    return super.getAll({
      filters: [{ field: 'idVendedor', op: 'eq', value: idVendedor }],
    });
  }

  /**
   * Sincroniza las relaciones cliente-vendedor usando syncSmart.
   * @param idVendedor ID del vendedor
   * @param clientes Array de IDs de clientes a asignar
   */
  syncClientes(idVendedor: number, clientes: number[]): Observable<any> {
    const relaciones = clientes.map((idCliente) => ({
      idVendedor,
      idCliente,
      esActivo: 1,
    }));

    return this.db.syncSmart(
      'ClienteVendedor',
      'idVendedor',
      idVendedor,
      relaciones,
      'idCliente'
    );
  }
}

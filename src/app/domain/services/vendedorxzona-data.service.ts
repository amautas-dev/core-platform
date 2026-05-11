import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import {
  VendedorxZona,
  VendedorxZonaInsert,
} from '../../domain/models/vendedorxzona.interface';

@Injectable({ providedIn: 'root' })
export class VendedorxZonaDataService extends BaseDataService<VendedorxZona> {
  protected entityName = 'VendedorxZona';
  protected override db = inject(DbService);

  /**
   * Lista zonas asignadas a un vendedor (incluye activas e inactivas).
   */
  getByVendedor(idVendedor: number): Observable<VendedorxZona[]> {
    return super.getAllIncludingDeleted({
      filters: [{ field: 'idVendedor', op: 'eq', value: idVendedor }],
      orderBy: [{ field: 'fechaAlta', dir: 'desc' }],
    });
  }

  /**
   * Lista vendedores asignados a una zona.
   */
  getByZona(idZona: number): Observable<VendedorxZona[]> {
    return super.getAll({
      filters: [{ field: 'idZona', op: 'eq', value: idZona }],
      joins: ['idVendedor.Usuario.Persona'],
      orderBy: [{ field: 'fechaAlta', dir: 'asc' }],
    });
  }

  /**
   * Reasignar completamente las zonas (resetea y vuelve a insertar).
   */
  async resetAndBulkInsert(idVendedor: number, zonas: number[]): Promise<void> {
    await this.db.rawPost('VendedorxZona/reset', { idVendedor }).toPromise();

    const body: VendedorxZonaInsert[] = zonas.map((idZona) => ({
      idVendedor,
      idZona,
      esActivo: 1,
    }));

    await this.db.rawPost('VendedorxZona/bulkInsert', body).toPromise();
  }
}

import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, firstValueFrom } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { RepartidorxZona, RepartidorxZonaInsert } from '../../domain/models/repartidorxzona.interface';

@Injectable({ providedIn: 'root' })
export class RepartidorxZonaDataService extends BaseDataService<RepartidorxZona> {
  protected entityName = 'RepartidorxZona';
  protected override db = inject(DbService);

  /**
   * Lista zonas asignadas a un repartidor (incluye activas e inactivas).
   */
  getByRepartidor(idRepartidor: number): Observable<RepartidorxZona[]> {
    return super.getAllIncludingDeleted({
      filters: [{ field: 'idRepartidor', op: 'eq', value: idRepartidor }],
      orderBy: [{ field: 'fechaAlta', dir: 'desc' }],
    });
  }

  /**
   * Reasignar completamente las zonas (resetea y vuelve a insertar).
   */
  async resetAndBulkInsert(idRepartidor: number, zonas: number[]): Promise<void> {
    await firstValueFrom(
      this.db.rawPost('RepartidorxZona/reset', { idRepartidor })
    );

    const body: RepartidorxZonaInsert[] = zonas.map((idZona) => ({
      idRepartidor,
      idZona,
      esActivo: 1,
    }));

    await firstValueFrom(
      this.db.rawPost('RepartidorxZona/bulkInsert', body)
    );
  }
}

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { EstadoCuentaCorriente } from '../../domain/models/estado-cuenta-corriente.interface';

@Injectable({ providedIn: 'root' })
export class EstadoCuentaCorrienteDataService extends BaseDataService<EstadoCuentaCorriente> {
  protected entityName = 'EstadoCuentaCorriente';

  /**
   * Obtiene todos los estados de cuenta corriente, ordenados por nombre.
   */
  getEstados(): Observable<EstadoCuentaCorriente[]> {
    return this.getAll({
      orderBy: [{ field: 'nombreEstadoCuenta', dir: 'asc' }],
    });
  }
}

import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import { AuditLog } from '../../domain/models/_common/audit-log.interface';

@Injectable({ providedIn: 'root' })
export class AuditLogDataService extends BaseDataService<AuditLog> {
  protected entityName = 'audit_log';

  /**
   * Obtiene todos los logs de auditoría, ordenados por fecha descendente.
   * Formatea las fechas para mostrar en formato local.
   */
  override getAll(): Observable<AuditLog[]> {
    return this.getAllIncludingDeleted({
      orderBy: [{ field: 'ts', dir: 'desc' }],
    }).pipe(
      map((logs) =>
        logs.map((l) => ({
          ...l,
          ts: new Date(l.ts).toLocaleString('es-AR'),
        }))
      )
    );
  }
}

import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { Observable, map, of, switchMap } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import {
  Vendedor,
  VendedorDTO,
  VendedorForm,
  VendedorTabla,
} from '../../domain/models/vendedor.interface';

@Injectable({ providedIn: 'root' })
export class VendedorDataService extends BaseDataService<Vendedor> {
  protected entityName = 'Vendedor';
  protected override db = inject(DbService);

  getVendedores(): Observable<Partial<VendedorDTO>[]> {
    return this.db
      .list<any>('Vendedor', {
        joins: ['Usuario.Persona, Persona.Rol'],
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
      })
      .pipe(
        map((v) =>
          v.map((vendedor) => ({
            idVendedor: vendedor.idVendedor,
            porcentajeVenta: vendedor.porcentajeVenta,
            fechaIngreso: vendedor.fechaIngreso,
            esActivo: vendedor.esActivo,
            fechaAlta: vendedor.fechaAlta,
            fechaBaja: vendedor.fechaBaja,
            idUsuario: {
              idUsuario: vendedor.idUsuario?.idUsuario,
              usuario: vendedor.idUsuario?.usuario,
              clave: '',
              esActivo: vendedor.idUsuario?.esActivo,
              fechaAlta: vendedor.idUsuario?.fechaAlta,
              fechaBaja: vendedor.idUsuario?.fechaBaja,
              idUsuarioAlta: vendedor.idUsuario?.idUsuarioAlta,
              idUsuarioBaja: vendedor.idUsuario?.idUsuarioBaja,

              idPersona: {
                idPersona: vendedor.idUsuario?.idPersona?.idPersona,
                nombre: vendedor.idUsuario?.idPersona?.nombre,
                apellido: vendedor.idUsuario?.idPersona?.apellido,
                dni: vendedor.idUsuario?.idPersona?.dni,
              },
              rol: {
                idRol: vendedor.idUsuario?.idPersona?.Rol.idRol,
                nombreRol: vendedor.idUsuario?.idPersona?.Rol.nombreRol,
              },
            },
          }))
        )
      );
  }

  getVendedoresTabla(): Observable<VendedorTabla[]> {
    return this.db
      .listFull<any>('Vendedor', {
        joins: ['Usuario.Persona'],
        filters: [],
      })
      .pipe(
        map((vendedores) =>
          vendedores.map((v) => {
            // Extraer idUsuario correctamente (puede venir como objeto por el join o como número)
            let idUsuario: number | undefined = undefined;
            if (typeof v.idUsuario === 'object' && v.idUsuario !== null) {
              idUsuario = v.idUsuario.idUsuario ?? v.idUsuario.id ?? undefined;
            } else if (typeof v.idUsuario === 'number') {
              idUsuario = v.idUsuario;
            }
            
            return {
            id: v.idVendedor,
            idUsuario: idUsuario, // ID del usuario
            nombreCompleto: `${v.idUsuario?.idPersona?.nombre ?? ''} ${
              v.idUsuario?.idPersona?.apellido ?? ''
            }`,
            porcentajeVenta: v.porcentajeVenta,
            fechaIngreso: v.fechaIngreso,
            estado: v.esActivo ? 'Activo' : 'Inactivo',
            estadoColor: v.esActivo ? 'activo' : 'inactivo',

            // ➕ nuevos campos representativos
            dni: v.idUsuario?.idPersona?.dni ?? '',
            email: v.idUsuario?.idPersona?.email ?? '',
            telefono: v.idUsuario?.idPersona?.telefono ?? '',
            usuario: v.idUsuario?.usuario ?? '',
            fechaAlta: v.fechaAlta ?? null,
            // Campos para tipos de contrato
            idTipoContrato: v.idTipoContrato ?? null,
            // Mapear salarioMensual (nombre en BD) a salarioFijoMensual (nombre en código)
            salarioFijoMensual: v.salarioMensual ?? v.salarioFijoMensual ?? null,
            porcentajePorObjetivos: v.porcentajePorObjetivos ?? null,
            // Mapear montoObjetivoEstablecido (nombre en BD) a objetivoEstablecido (nombre en código)
            objetivoEstablecido: v.montoObjetivoEstablecido ?? v.objetivoEstablecido ?? null,
            porcentajeFijo: v.porcentajeFijo ?? null,
          };
          })
        )
      );
  }

  /**
   * Crea un nuevo vendedor.
   */
  crearVendedor(dto: VendedorForm): Observable<any> {
    return this.createEntity(dto);
  }

  /**
   * Actualiza un vendedor existente.
   */
  actualizarVendedor(idVendedor: number, dto: VendedorForm): Observable<any> {
    return this.updateEntity(idVendedor, dto, false);
  }

  /**
   * Desactiva un vendedor (soft delete).
   */
  desactivarVendedor(idVendedor: number): Observable<any> {
    return this.delete(idVendedor);
  }

  /**
   * Reactiva un vendedor.
   */
  reactivarVendedor(idVendedor: number): Observable<any> {
    return this.reactivateEntity(idVendedor);
  }

  /**
   * Reactiva un vendedor por su ID de usuario.
   */
  reactivarVendedorPorUsuario(idUsuario: number) {
    return super.getAll({
      filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
    }).pipe(
      switchMap((res) =>
        res.length
          ? this.reactivateEntity(res[0].idVendedor)
          : of(null)
      )
    );
  }

  /**
   * Desactiva un vendedor por su ID de usuario.
   */
  desactivarVendedorPorUsuario(idUsuario: number) {
    return super.getAll({
      filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
    }).pipe(
      switchMap((res) =>
        res.length
          ? this.delete(res[0].idVendedor)
          : of(null)
      )
    );
  }
}

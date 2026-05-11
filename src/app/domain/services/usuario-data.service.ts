import { Injectable, inject } from '@angular/core';
import { DbService, EncryptionService } from 'ui-kit';
import { Observable, map, switchMap, of, forkJoin } from 'rxjs';
import { BaseDataService } from 'ui-kit';
import {
  Usuario,
  UsuarioDTO,
  UsuarioForm,
  UsuarioResumen,
} from '../../domain/models/_common/usuario.interface';
import { RolResumen } from '../../domain/models/_common/rol.interface';
import { Persona } from '../../domain/models/_common/persona.interface';
import { VendedorDataService } from './vendedor-data.service';
import { RepartidorDataService } from './repartidor-data.service';

@Injectable({ providedIn: 'root' })
export class UsuarioDataService extends BaseDataService<Usuario> {
  protected entityName = 'Usuario';
  protected override db = inject(DbService);
  private vendedorSrv = inject(VendedorDataService);
  private repartidorSrv = inject(RepartidorDataService);
  private encryption = inject(EncryptionService);

  // === Listado resumen simple (para tablas/listas) ===
  getUsuarios(): Observable<UsuarioResumen[]> {
    return this.db
      .list<any>('Usuario', {
        joins: ['Persona', 'Rol'],
        filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
        orderBy: [{ field: 'idUsuario', dir: 'asc' }],
      })
      .pipe(
        map((usuarios) =>
          usuarios.map((u: any) => ({
            id: u.idUsuario,
            usuario: u.usuario,
            nombreCompleto: `${u.idPersona?.nombre ?? ''} ${
              u.idPersona?.apellido ?? ''
            }`.trim(),
          }))
        )
      );
  }

  // === DTO completo para ABM (incluye Persona completa y Rol) ===
  getUsuariosDTO(): Observable<UsuarioDTO[]> {
    return this.db
      .listFull<any>('Usuario', {
        joins: ['Persona', 'Rol'],
        orderBy: [{ field: 'idUsuario', dir: 'asc' }],
      })
      .pipe(
        map((usuarios) =>
          usuarios.map((u: any): UsuarioDTO => {
            // u.idRol puede venir como número o como objeto (por el join Rol)
            const idRol: number | string =
              (u.idRol && typeof u.idRol === 'object'
                ? u.idRol.idRol
                : u.idRol) ?? '';

            const rol: Partial<RolResumen> = {
              idRol:
                typeof idRol === 'number' ? idRol : Number(idRol) || undefined,
              nombreRol:
                u.idRol?.nombreRol ??
                u.Rol?.nombreRol ??
                (typeof u.rolNombre === 'string' ? u.rolNombre : undefined),
            };

            return {
              idUsuario: u.idUsuario,
              usuario: u.usuario,
              idPersona: u.idPersona as Persona, // viene del join 'Persona'
              clave: '', // nunca devolvemos la real
              idRol: String(idRol ?? ''), // tu modelo actual lo usa como string
              rol, // objeto con meta del rol (parcial)
              esActivo: !!u.esActivo,
            } as unknown as UsuarioDTO;
          })
        )
      );
  }

  // === Crear usuario (Persona -> Usuario) ===
  crearUsuario(form: UsuarioForm): Observable<number> {
    const userId = this.db.getUserId();

    // ⚠️ En modo creación, la clave es obligatoria
    const plain = (form.clave ?? '').trim();
    if (!plain) {
      throw new Error('La clave es obligatoria al crear un usuario.');
    }

    // 🔒 Encriptar antes de enviar
    const hashed = this.encryption.hashSHA256(plain);

    return (this.db.create('Persona', form.persona) as Observable<number>).pipe(
      switchMap(
        (idPersona: number) =>
          this.db.create('Usuario', {
            idPersona,
            usuario: form.usuario?.trim() ?? '',
            clave: hashed,
            idRol: form.idRol,
            esActivo: 1,
            idUsuarioAlta: userId ?? null,
          }) as Observable<number>
      )
    );
  }

  // === Actualizar usuario (solo campos de Usuario) ===
  actualizarUsuario(
    idUsuario: number,
    dto: Partial<UsuarioForm>
  ): Observable<any> {
    // OJO: Persona se actualiza en su propio flujo (no mandamos objeto persona acá)
    const payload: any = {};

    if (dto.usuario !== undefined) payload.usuario = dto.usuario;
    if (dto.idRol !== undefined) payload.idRol = dto.idRol;

    // 🔐 Solo enviar "clave" si viene con contenido (no blanquear jamás)
    const plain = (dto.clave ?? '').trim();
    if (plain.length > 0) {
      payload.clave = this.encryption.hashSHA256(plain);
    }

    // Si no hay nada que actualizar, devolvemos un observable vacío OK
    if (Object.keys(payload).length === 0) return of(null);

    return this.db.update('Usuario', idUsuario, payload).pipe(
      switchMap(() => {
        // 🔹 2. Si el rol cambió, sincronizamos las tablas asociadas
        if (dto.idRol !== undefined) {
          return this.syncTablasAsociadas(idUsuario, dto.idRol);
        }
        return of(null);
      })
    );
  }

  // === Desactivar usuario (soft delete) ===
  desactivarUsuario(id: number): Observable<any> {
    return this.delete(id);
  }

  /** Desactivar Usuario, Persona y roles asociados */
  desactivarUsuarioCompleto(
    idUsuario: number,
    idRol: number,
    idPersona?: number
  ) {
    const userId = this.db.getUserId();
    const operaciones = [];

    operaciones.push(this.db.deactivate('Usuario', idUsuario, userId!));

    if (idPersona) {
      operaciones.push(this.db.deactivate('Persona', idPersona, userId!));
    }

    if (idRol === 3 || idRol === 5) {
      operaciones.push(
        this.vendedorSrv.desactivarVendedorPorUsuario(idUsuario)
      );
    }
    if (idRol === 4) {
      operaciones.push(
        this.repartidorSrv.desactivarRepartidorPorUsuario(idUsuario)
      );
    }

    return forkJoin(operaciones);
  }

  /** Reactivar Usuario, Persona y roles asociados */
  reactivarUsuarioCompleto(
    idUsuario: number,
    idRol: number,
    idPersona?: number
  ) {
    const userId = this.db.getUserId();
    const operaciones = [];

    operaciones.push(this.db.reactivate('Usuario', idUsuario));

    if (idPersona) {
      operaciones.push(this.db.reactivate('Persona', idPersona));
    }

    if (idRol === 3 || idRol === 5) {
      operaciones.push(this.vendedorSrv.reactivarVendedorPorUsuario(idUsuario));
    }
    if (idRol === 4) {
      operaciones.push(
        this.repartidorSrv.reactivarRepartidorPorUsuario(idUsuario)
      );
    }

    return forkJoin(operaciones);
  }
  /**
   * 🔄 Sincroniza las tablas Vendedor / Repartidor / Cobrador según el rol activo.
   * Usa métodos estándar de DbService (list, update, create).
   */
  private syncTablasAsociadas(
    idUsuario: number,
    idRol: number
  ): Observable<any> {
    const tablas = ['Vendedor', 'Repartidor'];
    const tablaActiva =
      idRol === 3 || idRol === 5
        ? 'Vendedor'
        : idRol === 4
        ? 'Repartidor'
        : null;

    // 1️⃣ Desactivar todas las tablas distintas a la activa
    const desactivaciones = tablas
      .filter((t) => t !== tablaActiva)
      .map((tabla) =>
        this.db
          .list(tabla, {
            filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
          })
          .pipe(
            switchMap((res: any[]) => {
              if (res.length > 0 && res[0].esActivo === 1) {
                return this.db.update(tabla, res[0].id, { esActivo: 0 });
              }
              return of(null);
            })
          )
      );

    // 2️⃣ Activar o crear la tabla activa (si corresponde)
    let activacion$: Observable<any> = of(null);
    if (tablaActiva) {
      activacion$ = this.db
        .list(tablaActiva, {
          filters: [{ field: 'idUsuario', op: 'eq', value: idUsuario }],
        })
        .pipe(
          switchMap((res: any[]) => {
            if (res.length === 0) {
              // no existe → crear
              return this.db.create(tablaActiva, { idUsuario, esActivo: 1 });
            } else if (res[0].esActivo === 0) {
              // existe pero inactivo → reactivar
              return this.db.update(tablaActiva, res[0].id, { esActivo: 1 });
            }
            return of(null);
          })
        );
    }

    // Ejecutamos desactivaciones + activación en paralelo
    return forkJoin([...desactivaciones, activacion$]);
  }
}

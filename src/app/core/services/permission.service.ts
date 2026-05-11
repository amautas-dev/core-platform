import { Injectable, inject, signal, computed, effect, Signal } from '@angular/core';
import { PermisosService } from '../../domain/services/permisos.service';
import { SessionDataService } from './session-data.service';
import { PermisoRol } from '../../domain/models/_common/permiso-rol.interface';
import { Funcionalidad } from '../../domain/models/_common/funcionalidad.interface';
import { firstValueFrom } from 'rxjs';
// import { PERMISSION_SERVICE_TOKEN, PermissionService as UiKitPermissionService } from 'ui-kit'; // TODO: Verificar exportación en ui-kit

/**
 * Servicio reactivo para verificación de permisos con Signals.
 * Cachea permisos por rol para mejor performance.
 * 
 * También implementa la interfaz PermissionService del UI-Kit para compatibilidad
 * con TableActionsComponent.
 */
@Injectable({ providedIn: 'root' })
// TODO: Descomentar cuando PERMISSION_SERVICE_TOKEN esté exportado en ui-kit
// export class PermissionService implements UiKitPermissionService {
export class PermissionService {
  private permisosService = inject(PermisosService);
  private session = inject(SessionDataService);

  // 🔹 Cache de permisos cargados por rol
  private permisosCache = signal<Map<number, PermisoRol[]>>(new Map());

  // 🔹 Rol actual (computed desde session)
  private rolActual = computed(() => this.session.idRol());

  constructor() {
    // 🔹 Cargar permisos cuando cambia el rol
    effect(() => {
      const rol = this.rolActual();
      if (rol && !this.permisosCache().has(rol)) {
        this.cargarPermisos(rol);
      }
    });
  }

  /**
   * Carga los permisos del rol desde el backend y los cachea
   */
  private async cargarPermisos(idRol: number): Promise<void> {
    try {
      const permisos = await firstValueFrom(
        this.permisosService.getPermisosPorRol(idRol)
      );
      this.permisosCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(idRol, permisos);
        return newCache;
      });
    } catch (error) {
      console.error('Error al cargar permisos:', error);
      // En caso de error, cachear array vacío
      this.permisosCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.set(idRol, []);
        return newCache;
      });
    }
  }

  /**
   * Obtiene el permiso para una funcionalidad específica
   */
  private getPermiso(
    idRol: number | null,
    nombreFuncionalidad: string
  ): PermisoRol | null {
    if (!idRol) return null;

    const permisos = this.permisosCache().get(idRol) ?? [];
    return (
      permisos.find((p) => {
        const func =
          typeof p.idFuncionalidad === 'object'
            ? p.idFuncionalidad
            : null;
        return func?.nombre === nombreFuncionalidad;
      }) ?? null
    );
  }

  /**
   * Verifica si el usuario actual tiene un permiso específico
   * @param funcionalidad Nombre de la funcionalidad (ej: 'Productos', 'Usuarios')
   * @param accion Acción requerida: 'ver', 'editar', 'borrar'
   * @returns Signal<boolean> que se actualiza reactivamente
   * 
   * @deprecated Usar tienePermisoSignal() internamente. Este método ahora implementa la interfaz del UI-Kit.
   */
  /**
   * Verifica si el usuario actual tiene un permiso específico (método original con Signal)
   * @param funcionalidad Nombre de la funcionalidad (ej: 'Productos', 'Usuarios')
   * @param accion Acción requerida: 'ver', 'editar', 'borrar'
   * @returns Signal<boolean> que se actualiza reactivamente
   */
  tienePermisoSignal(
    funcionalidad: string,
    accion: 'ver' | 'editar' | 'borrar'
  ): Signal<boolean> {
    return computed(() => {
      const rol = this.rolActual();
      if (!rol) return false;

      const permiso = this.getPermiso(rol, funcionalidad);
      if (!permiso || !permiso.esActivo) return false;

      switch (accion) {
        case 'ver':
          return permiso.puedeVer === true;
        case 'editar':
          return permiso.puedeEditar === true;
        case 'borrar':
          return permiso.puedeBorrar === true;
        default:
          return false;
      }
    });
  }

  /**
   * Método sobrecargado: retorna Signal<boolean> para uso interno
   */
  tienePermiso(
    funcionalidad: string,
    accion: 'ver' | 'editar' | 'borrar'
  ): Signal<boolean>;
  
  /**
   * Método sobrecargado: retorna () => boolean para UI-Kit
   */
  tienePermiso(funcionalidad: string, accion: string): () => boolean;
  
  /**
   * Implementación del método sobrecargado
   */
  tienePermiso(
    funcionalidad: string,
    accion: 'ver' | 'editar' | 'borrar' | string
  ): Signal<boolean> | (() => boolean) {
    // Si accion es específico ('ver' | 'editar' | 'borrar'), retornar Signal
    if (accion === 'ver' || accion === 'editar' || accion === 'borrar') {
      return this.tienePermisoSignal(funcionalidad, accion);
    }
    
    // Para UI-Kit, retornar función
    const permisoSignal = this.tienePermisoSignal(funcionalidad, accion as 'ver' | 'editar' | 'borrar');
    return () => permisoSignal();
  }

  /**
   * Verifica múltiples permisos (AND - todos deben cumplirse)
   */
  tieneTodosLosPermisos(
    permisos: Array<{ funcionalidad: string; accion: 'ver' | 'editar' | 'borrar' }>
  ): Signal<boolean> {
    return computed(() => {
      return permisos.every((p) =>
        this.tienePermisoSignal(p.funcionalidad, p.accion)()
      );
    });
  }

  /**
   * Verifica si tiene al menos uno de los permisos (OR)
   */
  tieneAlgunPermiso(
    permisos: Array<{ funcionalidad: string; accion: 'ver' | 'editar' | 'borrar' }>
  ): Signal<boolean> {
    return computed(() => {
      return permisos.some((p) =>
        this.tienePermisoSignal(p.funcionalidad, p.accion)()
      );
    });
  }

  /**
   * Fuerza la recarga de permisos (útil después de cambios)
   */
  async recargarPermisos(): Promise<void> {
    const rol = this.rolActual();
    if (rol) {
      this.permisosCache.update((cache) => {
        const newCache = new Map(cache);
        newCache.delete(rol);
        return newCache;
      });
      await this.cargarPermisos(rol);
    }
  }

}


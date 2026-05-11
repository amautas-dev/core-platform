import {
  Directive,
  inject,
  Input,
  TemplateRef,
  ViewContainerRef,
  effect,
  computed,
  signal,
} from '@angular/core';
import { PermissionService } from '../services/permission.service';

/**
 * Directiva estructural para mostrar/ocultar elementos según permisos.
 *
 * @usage
 * ```html
 * <ng-container *hasPermission="{ funcionalidad: 'Productos', action: 'editar' }">
 *   <button mat-icon-button>
 *     <mat-icon>edit</mat-icon>
 *   </button>
 * </ng-container>
 * ```
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);
  private permissionService = inject(PermissionService);

  // 🔹 Signals para funcionalidad y action
  private funcionalidad = signal<string>('');
  private action = signal<'ver' | 'editar' | 'borrar'>('ver');

  @Input({ required: true })
  set hasPermission(value: string | { funcionalidad: string; action?: 'ver' | 'editar' | 'borrar' }) {
    if (typeof value === 'string') {
      this.funcionalidad.set(value);
      this.action.set('ver');
    } else {
      this.funcionalidad.set(value.funcionalidad);
      this.action.set(value.action || 'ver');
    }
  }

  // 🔹 Signal de permiso - reactivo a cambios en funcionalidad y action
  private tienePermiso = computed(() => {
    const signal = this.permissionService.tienePermiso(this.funcionalidad(), this.action());
    return signal();
  });

  constructor() {
    // 🔹 Efecto que muestra/oculta el elemento según el permiso
    effect(() => {
      const tiene = this.tienePermiso();
      if (tiene) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      } else {
        this.viewContainer.clear();
      }
    });
  }
}



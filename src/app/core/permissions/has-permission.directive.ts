import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  inject,
  effect,
  input,
} from '@angular/core';
import { PermissionService } from './permission.service';

/**
 * Structural directive *hasPermission.
 * Muestra u oculta el elemento según si el usuario tiene el permiso.
 * Así podrás hacer en el template, en lugar de lógica en el componente:
 *
 * <button *hasPermission="'users.create'">Crear usuario</button>
 *
 * También acepta constantes: *hasPermission="PERMISSIONS.USERS_CREATE"
 */
@Directive({
  selector: '[hasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly permissionService = inject(PermissionService);
  private readonly templateRef = inject(TemplateRef<unknown>);
  private readonly viewContainer = inject(ViewContainerRef);

  readonly permission = input.required<string>({ alias: 'hasPermission' });

  constructor() {
    effect(() => {
      const perm = this.permission();
      const hasAccess = perm
        ? this.permissionService.hasPermission(perm)
        : false;

      this.viewContainer.clear();
      if (hasAccess) {
        this.viewContainer.createEmbeddedView(this.templateRef);
      }
    });
  }
}

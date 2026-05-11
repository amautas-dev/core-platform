import { Injectable, inject, signal } from '@angular/core';
import { MenuItem } from '../models/_common/menu-item.interface';
import { PermisosService } from './permisos.service';
import { Funcionalidad } from '../../domain/models/_common/funcionalidad.interface';
import { firstValueFrom } from 'rxjs';
import { SessionDataService } from '../../core/services/session-data.service';

@Injectable({ providedIn: 'root' })
export class MenuService {
  private permisos = inject(PermisosService);
  private session = inject(SessionDataService);

  private _menuItems = signal<MenuItem[]>([]);
  menuItems = this._menuItems.asReadonly();

  async loadMenuFromBackend(): Promise<void> {
    const user = this.session.user();
    if (!user || !user.idRol) {
      this._menuItems.set([]);
      return;
    }

    const funcionalidades = await firstValueFrom(
      this.permisos.getFuncionalidadesPermitidas(user.idRol)
    );

    if (!funcionalidades?.length) {
      console.warn('No hay funcionalidades permitidas para este rol', user.idRol);
      this._menuItems.set([]);
      return;
    }

    // ✅ Mapeo recursivo a MenuItem
    const mapToMenuItems = (fList: Funcionalidad[]): MenuItem[] =>
      fList.map((f) => ({
        id: f.idFuncionalidad,
        icon: f.icono ?? 'menu',
        label: f.nombre,
        path: f.path ?? '/',
        order: f.orden ?? 0,
        children: f.children ? mapToMenuItems(f.children) : [],
      }));

    const items = mapToMenuItems(funcionalidades).sort(
      (a, b) => a.order - b.order
    );

    // Agregar item de Amautas Dev si el usuario es administrador de AMAUTAS
    if (this.session.isAmautasAdmin) {
      items.push({
        id: -1, // ID negativo para distinguirlo de funcionalidades reales
        icon: 'settings',
        label: 'Amautas Dev',
        path: '/admin-dev',
        order: 9999, // Al final del menú
        children: [],
      });
    }

    this._menuItems.set(items);
  }

  getMenuForSidebar(): MenuItem[] {
    return this._menuItems();
  }

  getTitleFromPath(path: string): string {
    // Caso especial para admin-pedido
    if (path === '/admin-pedido' || path.startsWith('/admin-pedido/')) {
      return 'Pedidos';
    }
    
    const menu = this._menuItems();
    const item = menu.find((i) => i.path === path);
    return item?.label ?? 'Inicio';
  }
}

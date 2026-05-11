import { Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';

const PERMISSIONS_STORAGE_KEY = 'auth.permissions';

/**
 * Stores permissions from login and provides checks for route access and UI visibility.
 * Supports: "*" (all), "module.*" (all actions in module), "module.action" (exact).
 */
@Injectable({ providedIn: 'root' })
export class PermissionService {
  private _permissions = signal<readonly string[]>([]);
  readonly permissions = this._permissions.asReadonly();

  setPermissions(permissions: string[]): void {
    if (environment.authDebug) {
      console.log('[AUTH DEBUG] Setting permissions', permissions);
    }
    const list = [...permissions];
    this._permissions.set(list);
    try {
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(list));
    } catch {
      // ignore storage errors
    }
  }

  clearPermissions(): void {
    this._permissions.set([]);
    try {
      localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Restore permissions from localStorage (e.g. on app load when user has existing token).
   */
  restoreFromStorage(): void {
    try {
      const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
      if (raw) {
        const list = JSON.parse(raw) as string[];
        if (Array.isArray(list)) {
          this._permissions.set(list);
          if (environment.authDebug) {
            console.log('[AUTH DEBUG] Restored permissions from storage', list.length);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  /**
   * Check if the user has the given permission.
   * Supports: "*" (any), "module.*" (any action in module), "module.action" (exact match).
   */
  hasPermission(required: string): boolean {
    if (environment.authDebug) {
      console.log('[AUTH DEBUG] Checking permission', required);
    }
    const list = this._permissions();
    for (const p of list) {
      if (p === '*') return true;
      if (p === required) return true;
      if (p.endsWith('.*')) {
        const modulePrefix = p.slice(0, -1);
        if (required.startsWith(modulePrefix)) return true;
      }
    }
    return false;
  }

  /**
   * Check if the user has any permission for the module (e.g. "users" matches "users.read", "users.*", etc.).
   */
  hasModuleAccess(module: string): boolean {
    const prefix = module.endsWith('.') ? module : `${module}.`;
    return this._permissions().some((p) => p === '*' || p === `${module}.*` || p.startsWith(prefix));
  }
}

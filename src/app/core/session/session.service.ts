import { Injectable, signal, computed } from '@angular/core';
import { User } from '../../shared/models/user.model';
import { Tenant } from '../../shared/models/tenant.model';
import { Role } from '../../shared/models/role.model';

/**
 * Servicio de sesión. Almacena y expone el estado del usuario, tenant y rol
 * mediante Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class SessionService {
  private _user = signal<User | null>(null);
  private _tenant = signal<Tenant | null>(null);
  private _role = signal<Role | null>(null);

  readonly user = this._user.asReadonly();
  readonly tenant = this._tenant.asReadonly();
  readonly role = this._role.asReadonly();

  setUser(user: User | null): void {
    this._user.set(user);
  }

  setTenant(tenant: Tenant | null): void {
    this._tenant.set(tenant);
  }

  setRole(role: Role | null): void {
    this._role.set(role);
  }

  clear(): void {
    this._user.set(null);
    this._tenant.set(null);
    this._role.set(null);
  }
}

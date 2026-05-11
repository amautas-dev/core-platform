import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from '../api/api.service';
import { SessionService } from '../session/session.service';
import { PermissionService } from '../permissions/permission.service';
import { DbTranslationsLoaderService } from '../i18n/db-translations.loader';
import { PlatformRoutePathsService } from '../routing/platform-route-paths.service';
import { User } from '../../shared/models/user.model';
import { Tenant } from '../../shared/models/tenant.model';
import { Role } from '../../shared/models/role.model';

const TOKEN_KEY = 'auth.token';

/** Único endpoint de login para platform-admin: tabla platform_user (API Node). NO usar auth/login ni custom/auth. */
const PLATFORM_LOGIN_PATH = 'platform/auth/login';

export interface JwtPayload {
  sub?: string;
  email?: string;
  name?: string;
  idTenant?: number;
  idRole?: number;
  tenant?: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

export interface LoginResponse {
  readonly token: string;
  readonly user?: User;
  readonly tenant?: Tenant;
  readonly role?: Role;
  /** Permission strings (e.g. "users.read", "users.create"). */
  readonly permissions?: readonly string[];
}

/** Respuesta del login de plataforma (POST /api/platform/auth/login). */
export interface PlatformLoginResponse {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresAt?: string;
  readonly user?: { id: number; email?: string; name?: string; roleCode?: string };
  /** Permission strings: "*", "module.*", or "module.action". */
  readonly permissions?: string[];
}

/**
 * Servicio de autenticación. Gestiona login, logout, token y estado de usuario
 * mediante Angular Signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private session = inject(SessionService);
  private permissionService = inject(PermissionService);
  private dbTranslations = inject(DbTranslationsLoaderService);
  private routePaths = inject(PlatformRoutePathsService);

  private _user = signal<User | null>(null);
  readonly user = this._user.asReadonly();
  readonly isLoggedInSignal = computed(() => !!this._user() && !!this.getToken());

  constructor() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const restored = this.userFromToken(token);
      if (restored) {
        this._user.set(restored);
        this.session.setUser(restored);
      }
      // Siempre restaurar permisos si hay token (para que el menú muestre los ítems al recargar)
      this.permissionService.restoreFromStorage();
      // Cargar traducciones de BD en cuanto hay sesión (para que al refrescar se vean los valores de BD)
      this.dbTranslations.loadFromDb().subscribe();
    }
  }

  isLoggedIn(): boolean {
    const token = this.getToken();
    if (!token) return false;
    const payload = this.decodeToken(token);
    return !!payload && (!payload.exp || payload.exp > Date.now() / 1000);
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const payload = token.split('.')[1];
      return payload ? (JSON.parse(atob(payload)) as JwtPayload) : null;
    } catch {
      return null;
    }
  }

  async login(username: string, password: string): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.api.post<PlatformLoginResponse>(PLATFORM_LOGIN_PATH, {
          email: username.trim(),
          password,
        })
      );

      const token = res.accessToken;
      if (!token) {
        throw new Error('No se recibió token del servidor');
      }

      localStorage.setItem(TOKEN_KEY, token);

      let user: User | null = null;
      if (res.user) {
        const u = res.user;
        user = {
          id: typeof u.id === 'string' ? parseInt(u.id, 10) : Number(u.id),
          email: u.email ?? username,
          name: u.name ?? u.email ?? 'Usuario',
        };
      }
      if (!user && token) {
        user = this.userFromToken(token);
      }
      if (!user) {
        localStorage.removeItem(TOKEN_KEY);
        throw new Error('Token inválido: no se pudo obtener el usuario');
      }

      this._user.set(user);
      this.session.setUser(user);
      this.session.setTenant(null);
      this.session.setRole(null);
      this.permissionService.setPermissions(res.permissions ?? []);

      await firstValueFrom(this.dbTranslations.loadFromDb().pipe(catchError(() => of(undefined))));

      this.router.navigateByUrl(this.routePaths.dashboard());
    } catch (error: unknown) {
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    this._user.set(null);
    this.session.clear();
    this.permissionService.clearPermissions();
    this.router.navigateByUrl('/login');
  }

  private userFromToken(token: string): User | null {
    const p = this.decodeToken(token);
    if (!p) return null;
    const sub = p.sub ?? p.email ?? '';
    const idVal = p['id'];
    const id = typeof idVal === 'number' ? idVal : parseInt(String(sub), 10);
    if (isNaN(id) && !sub) return null;
    return {
      id: !isNaN(id) ? id : 0,
      email: p.email ?? sub,
      name: p.name ?? p.email ?? 'Usuario',
      idTenant: p.idTenant,
      idRole: p.idRole,
    };
  }
}

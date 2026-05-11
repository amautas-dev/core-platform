import { Injectable, signal, computed, effect } from '@angular/core';
import { SessionData } from '../../domain/models/session-data.model';

const STORAGE_KEY = 'session-data';

interface SessionState {
  user: SessionData | null;
  idZona: number | null;
  nombreZona: string | null;
  idRol: number | null;
}

@Injectable({ providedIn: 'root' })
export class SessionDataService {
  private _state = signal<SessionState>({
    user: null,
    idZona: 0,
    nombreZona: '',
    idRol: 0,
  });

  readonly user = computed(() => this._state().user);
  readonly idZona = computed(() => this._state().idZona);
  readonly idRol = computed(() => this._state().idRol);

  constructor() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) this._state.set(JSON.parse(stored));

    effect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._state()));
    });
  }

  setUser(user: SessionData) {
    this._state.update((s) => ({ ...s, user, idRol: user.idRol }));
  }

  setZona(idZona: number) {
    this._state.update((s) => ({ ...s, idZona }));
  }
  setZonaCompleta(idZona: number, nombreZona: string) {
    this._state.update((s) => ({
      ...s,
      idZona,
      nombreZona,
    }));
  }

  setRol(idRol: number) {
    this._state.update((s) => ({ ...s, idRol }));
  }

  clear() {
    this._state.set({ user: null, idZona: 0, nombreZona: '', idRol: 0 });
    localStorage.removeItem(STORAGE_KEY);
  }

  get userData() {
    return this._state().user;
  }
  get idUsuario() {
    return this._state().user?.idUsuario ?? 0;
  }
  get zonaId() {
    return this._state().idZona;
  }
  get zonaNombre() {
    return this._state().nombreZona;
  }
  get rolId() {
    return this._state().idRol;
  }
  get isAdmin() {
    return this._state().idRol === 1 || this._state().idRol === 2;
  }
  get isAmautasAdmin() {
    return this._state().user?.isAmautasAdmin ?? false;
  }
}

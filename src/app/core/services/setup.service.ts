import { Injectable, inject } from '@angular/core';
import { DbService } from 'ui-kit';
import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SetupService {
  private db = inject(DbService);
  private readonly SETUP_COMPLETED_KEY = 'system_setup_completed';

  /**
   * Verifica si el sistema ya está configurado
   * Verifica si hay usuarios en el sistema
   */
  async isSystemConfigured(): Promise<boolean> {
    // Verificar en localStorage primero (más rápido)
    const completed = localStorage.getItem(this.SETUP_COMPLETED_KEY);
    if (completed === 'true') {
      return true;
    }

    try {
      // Verificar si hay usuarios en el sistema
      const usuarios = await firstValueFrom(
        this.db.list('Usuario', {
          filters: [{ field: 'esActivo', op: 'eq', value: 1 }],
        }).pipe(map((arr) => arr.slice(0, 1)))
      );

      const configured = usuarios && usuarios.length > 0;
      
      // Guardar en localStorage para futuras verificaciones
      if (configured) {
        localStorage.setItem(this.SETUP_COMPLETED_KEY, 'true');
      }

      return configured;
    } catch (error) {
      console.error('Error verificando configuración del sistema:', error);
      return false;
    }
  }

  /**
   * Marca el sistema como configurado
   */
  markAsConfigured(): void {
    localStorage.setItem(this.SETUP_COMPLETED_KEY, 'true');
  }

  /**
   * Resetea el estado de configuración (útil para testing)
   */
  resetSetup(): void {
    localStorage.removeItem(this.SETUP_COMPLETED_KEY);
  }
}

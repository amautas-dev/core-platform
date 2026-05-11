import { Injectable, signal, computed } from '@angular/core';

/**
 * Servicio para gestionar el estado de carga global de la aplicación.
 * Permite rastrear múltiples operaciones asíncronas simultáneas.
 */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingCount = signal<number>(0);
  private loadingOperations = signal<Set<string>>(new Set());

  /**
   * Observable que indica si hay alguna operación en curso.
   */
  readonly isLoading = computed(() => this.loadingCount() > 0);

  /**
   * Lista de operaciones activas.
   */
  readonly activeOperations = computed(() => Array.from(this.loadingOperations()));

  /**
   * Inicia una operación de carga.
   * @param operationId - ID opcional para identificar la operación
   */
  start(operationId?: string): void {
    this.loadingCount.update(count => count + 1);
    
    if (operationId) {
      this.loadingOperations.update(ops => {
        const newOps = new Set(ops);
        newOps.add(operationId);
        return newOps;
      });
    }
  }

  /**
   * Finaliza una operación de carga.
   * @param operationId - ID opcional de la operación a finalizar
   */
  stop(operationId?: string): void {
    this.loadingCount.update(count => Math.max(0, count - 1));
    
    if (operationId) {
      this.loadingOperations.update(ops => {
        const newOps = new Set(ops);
        newOps.delete(operationId);
        return newOps;
      });
    }
  }

  /**
   * Resetea el estado de carga (útil para casos de error).
   */
  reset(): void {
    this.loadingCount.set(0);
    this.loadingOperations.set(new Set());
  }

  /**
   * Verifica si una operación específica está en curso.
   * @param operationId - ID de la operación
   */
  isOperationLoading(operationId: string): boolean {
    return this.loadingOperations().has(operationId);
  }
}










































import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Servicio para notificar cambios en clientes y pagos
 * Permite que diferentes componentes se actualicen cuando hay cambios
 */
@Injectable({ providedIn: 'root' })
export class ClienteChangeService {
  // Signal que se incrementa cada vez que hay un cambio en clientes o pagos
  private changeCounter = signal<number>(0);
  
  // Subject para notificar cambios de forma reactiva
  private cambioCliente$ = new Subject<void>();

  /**
   * Observable que emite cuando hay cambios en clientes o pagos
   */
  get cambios$() {
    return this.cambioCliente$.asObservable();
  }

  /**
   * Obtiene el contador de cambios (para usar en effects)
   */
  get changeCount() {
    return this.changeCounter.asReadonly();
  }

  /**
   * Notifica que hubo un cambio en un cliente (creación, actualización, etc.)
   */
  notifyClienteChanged(): void {
    this.changeCounter.update(count => count + 1);
    this.cambioCliente$.next();
  }

  /**
   * Notifica que se registró un pago
   */
  notifyPagoRegistrado(): void {
    this.changeCounter.update(count => count + 1);
    this.cambioCliente$.next();
  }
}


import { Directive, ElementRef, HostListener } from '@angular/core';

/**
 * Directiva que selecciona automáticamente el contenido de un input
 * cuando recibe el foco. Útil para inputs numéricos y de montos.
 * 
 * @usage
 * ```html
 * <input matInput type="number" appSelectOnFocus />
 * <input matInput type="text" appSelectOnFocus />
 * ```
 */
@Directive({
  selector: '[appSelectOnFocus]',
  standalone: true,
})
export class SelectOnFocusDirective {
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('focus', ['$event'])
  onFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;
    // Usar setTimeout para asegurar que el valor esté disponible
    setTimeout(() => {
      input.select();
    }, 0);
  }
}


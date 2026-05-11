/**
 * Utilidad para limpiar backdrops y overlays bloqueados de Material Dialog
 */

export function limpiarBackdrops() {
  // Limpiar backdrops de Material Dialog
  const backdrops = document.querySelectorAll('.cdk-overlay-backdrop, .mat-dialog-backdrop');
  backdrops.forEach(backdrop => {
    if (backdrop instanceof HTMLElement) {
      backdrop.style.display = 'none';
      backdrop.remove();
    }
  });

  // Limpiar overlays bloqueados sin diálogos activos
  const overlays = document.querySelectorAll('.cdk-overlay-container');
  overlays.forEach(overlay => {
    const dialogs = overlay.querySelectorAll('.cdk-overlay-pane');
    if (dialogs.length === 0) {
      // Si no hay diálogos, limpiar el overlay
      const backdrop = overlay.querySelector('.cdk-overlay-backdrop');
      if (backdrop) {
        backdrop.remove();
      }
    }
  });

  // Limpiar loaders overlay bloqueados
  const loaderOverlays = document.querySelectorAll('.loader-overlay[style*="display: flex"], .loader-overlay:not([style*="display: none"])');
  loaderOverlays.forEach(overlay => {
    const parent = overlay.parentElement;
    if (parent && parent.querySelector('.cdk-overlay-pane') === null) {
      // Solo remover si no está dentro de un diálogo activo
      overlay.remove();
    }
  });

  // Asegurar que el body no tenga overflow hidden
  if (document.querySelectorAll('.cdk-overlay-backdrop').length === 0) {
    document.body.style.overflow = '';
    document.body.classList.remove('cdk-global-scrollblock');
  }

  console.log('✅ Backdrops y overlays bloqueados limpiados');
}

/**
 * Expone la función globalmente para poder llamarla desde la consola
 */
export function setupGlobalBackdropCleaner() {
  if (typeof window !== 'undefined') {
    (window as any).limpiarBackdrops = limpiarBackdrops;
    console.log('🛠️ Función global disponible: limpiarBackdrops() - Puedes llamarla desde la consola');
  }
}


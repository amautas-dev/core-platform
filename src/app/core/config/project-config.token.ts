import { InjectionToken } from '@angular/core';
import { ProjectConfig } from './project-config.interface';

/**
 * Token para inyectar la configuración del proyecto
 * 
 * Uso:
 * ```typescript
 * constructor(@Inject(PROJECT_CONFIG) private config: ProjectConfig) {}
 * 
 * // O con inject():
 * private config = inject(PROJECT_CONFIG);
 * ```
 */
export const PROJECT_CONFIG = new InjectionToken<ProjectConfig>('PROJECT_CONFIG');

import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { PlatformRoutePathsService } from '../../core/routing/platform-route-paths.service';

/** Redirige `/` al dashboard localizado (panel / dashboard). */
@Component({
  selector: 'app-home-redirect',
  standalone: true,
  template: '',
})
export class HomeRedirectPage {
  constructor() {
    const router = inject(Router);
    const paths = inject(PlatformRoutePathsService);
    void router.navigateByUrl(paths.dashboard(), { replaceUrl: true });
  }
}

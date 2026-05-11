import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { PlatformTranslatePipe } from '../../core/i18n/translate.pipe';
import { LanguageService } from '../../core/i18n/language.service';
import { PlatformRoutePathsService } from '../../core/routing/platform-route-paths.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    PlatformTranslatePipe,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() currentTitle = '';
  @Input() isMobile = false;
  @Input() userName = '';
  @Input() avatarUrl = 'assets/images/default-user.jpg';

  @Output() toggleSidebar = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();

  readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly routePaths = inject(PlatformRoutePathsService);

  /** Navegación explícita: `routerLink` en `mat-menu-item` a veces no dispara la ruta correctamente. */
  goToProfile(): void {
    void this.router.navigateByUrl(this.routePaths.profile());
  }
}

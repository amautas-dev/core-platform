import { Component, signal, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { setupGlobalBackdropCleaner } from './core/utils/backdrop-cleaner';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  protected readonly title = signal('distali-admin');

  ngOnInit() {
    // Configurar función global para limpiar backdrops bloqueados
    setupGlobalBackdropCleaner();
  }
}

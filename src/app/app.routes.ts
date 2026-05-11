import { Routes } from '@angular/router';
import { authGuard, authMatchGuard } from './core/guards/auth.guard';
import { LoginComponent } from './core/auth/login/login.component';
import { ShellComponent } from './layout/shell/shell.component';
import { shellChildren } from './shell.routes';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    canMatch: [authMatchGuard],
    canActivate: [authGuard],
    component: ShellComponent,
    children: shellChildren,
  },

  { path: '**', redirectTo: '' },
];

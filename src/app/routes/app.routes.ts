import { Routes } from '@angular/router';
import { authGuard, authMatchGuard } from '../core/guards/auth.guard';
import { LoginComponent } from '../core/auth/login/login.component';
import { ShellComponent } from '../layout/shell/shell.component';

export const appRoutes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    path: '',
    canMatch: [authMatchGuard],
    canActivate: [authGuard],
    component: ShellComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('../features/dashboard/pages/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'tenants',
        loadComponent: () =>
          import('../features/dashboard/pages/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('../features/dashboard/pages/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('../features/dashboard/pages/dashboard.page').then(
            (m) => m.DashboardPage
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },

  { path: '**', redirectTo: '' },
];

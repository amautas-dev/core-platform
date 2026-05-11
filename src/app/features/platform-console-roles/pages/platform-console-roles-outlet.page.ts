import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-platform-console-roles-outlet',
  standalone: true,
  imports: [RouterModule],
  template: '<router-outlet></router-outlet>',
})
export class PlatformConsoleRolesOutletPage {}

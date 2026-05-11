import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { ActiveMarketService } from '../../core/market/active-market.service';
import { PlatformTranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-active-market-bar',
  standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule, PlatformTranslatePipe],
  templateUrl: './active-market-bar.component.html',
  styleUrls: ['./active-market-bar.component.scss'],
})
export class ActiveMarketBarComponent {
  readonly market = inject(ActiveMarketService);

  onCountryChange(code: string): void {
    this.market.setCountry(code);
  }
}

import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PlatformTranslatePipe } from '../../../core/i18n/translate.pipe';
import { mergeThemeTokens } from '../../../core/theming/theme-token-merge';
import type { PartialThemeTokens } from '../../../core/theming/theme-token-merge';
import type { ColorStop, ThemeTokens } from '../../../core/theming/theme-tokens';
import { COLOR_SCALE_STOPS } from '../../../core/theming/theme-tokens';

const HEX = /^#[0-9A-Fa-f]{6}$/;

type ScaleName = 'primary' | 'accent' | 'neutral';
type FuncName = 'success' | 'warning' | 'error' | 'info';

@Component({
  selector: 'app-theme-palette-fine-tuning',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatTooltipModule, PlatformTranslatePipe],
  templateUrl: './theme-palette-fine-tuning.component.html',
  styleUrl: './theme-palette-fine-tuning.component.scss',
})
export class ThemePaletteFineTuningComponent {
  @Input({ required: true }) generated!: ThemeTokens;
  @Input() overrides: PartialThemeTokens | null = null;
  @Input() editMode: 'auto' | 'manual' = 'auto';

  @Output() overridesChange = new EventEmitter<PartialThemeTokens | null>();
  @Output() resetScale = new EventEmitter<ScaleName | 'functional'>();
  @Output() resetAll = new EventEmitter<void>();

  readonly stops: readonly ColorStop[] = COLOR_SCALE_STOPS;
  readonly scaleKeys: readonly ScaleName[] = ['primary', 'accent', 'neutral'];
  readonly functionalKeys: readonly FuncName[] = ['success', 'warning', 'error', 'info'];

  get resolved(): ThemeTokens {
    return mergeThemeTokens(this.generated, this.overrides);
  }

  trackStop = (_: number, s: ColorStop) => s;

  isOverridden(scale: ScaleName, stop: ColorStop): boolean {
    const o = this.overrides?.[scale]?.[stop];
    if (o == null || !String(o).trim()) return false;
    return String(o).trim().toLowerCase() !== this.generated[scale][stop].toLowerCase();
  }

  isFunctionalOverridden(key: FuncName): boolean {
    const o = this.overrides?.functional?.[key];
    if (o == null || !String(o).trim()) return false;
    return String(o).trim().toLowerCase() !== this.generated.functional[key].toLowerCase();
  }

  onScaleColorChange(scale: ScaleName, stop: ColorStop, value: string): void {
    const v = String(value ?? '').trim();
    if (!HEX.test(v)) return;
    const base: PartialThemeTokens = { ...this.overrides };
    const prevScale = { ...(base[scale] ?? {}) };
    if (v.toLowerCase() === this.generated[scale][stop].toLowerCase()) {
      delete prevScale[stop];
    } else {
      prevScale[stop] = v;
    }
    if (Object.keys(prevScale).length === 0) {
      delete base[scale];
    } else {
      base[scale] = prevScale;
    }
    this.emitClean(base);
  }

  onFunctionalChange(key: FuncName, value: string): void {
    const v = String(value ?? '').trim();
    if (!HEX.test(v)) return;
    const base: PartialThemeTokens = { ...this.overrides };
    const prevF = { ...(base.functional ?? {}) };
    if (v.toLowerCase() === this.generated.functional[key].toLowerCase()) {
      delete prevF[key];
    } else {
      prevF[key] = v;
    }
    if (Object.keys(prevF).length === 0) {
      delete base.functional;
    } else {
      base.functional = prevF;
    }
    this.emitClean(base);
  }

  resetOne(scale: ScaleName, stop: ColorStop): void {
    const base: PartialThemeTokens = { ...this.overrides };
    const prevScale = { ...(base[scale] ?? {}) };
    delete prevScale[stop];
    if (Object.keys(prevScale).length === 0) delete base[scale];
    else base[scale] = prevScale;
    this.emitClean(base);
  }

  emitResetScale(scale: ScaleName | 'functional'): void {
    this.resetScale.emit(scale);
  }

  emitResetAll(): void {
    this.resetAll.emit();
  }

  private emitClean(base: PartialThemeTokens): void {
    const has =
      (base.primary && Object.keys(base.primary).length > 0) ||
      (base.accent && Object.keys(base.accent).length > 0) ||
      (base.neutral && Object.keys(base.neutral).length > 0) ||
      (base.functional && Object.keys(base.functional).length > 0);
    this.overridesChange.emit(has ? base : null);
  }
}

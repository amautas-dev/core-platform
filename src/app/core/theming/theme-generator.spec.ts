import { generateTheme } from './theme-generator';
import { DEFAULT_THEME_GENERATOR_INPUT } from './theme-defaults';

describe('theme-generator', () => {
  it('genera escala 500 estable', () => {
    const t = generateTheme({ primary: '#1f6feb' });
    expect(t.primary[500].toLowerCase()).toBe('#1f6feb');
    expect(t.neutral[50]).toBeTruthy();
  });

  it('usa hue-shift cuando el secundario es neutro (crema)', () => {
    const t = generateTheme({ primary: '#1f6feb', secondary: '#f4ece4' });
    expect(t.accent[500]).toBeTruthy();
    expect(t.accent[500].toLowerCase()).not.toBe('#f4ece4');
  });

  it('defaults exportados son coherentes', () => {
    const t = generateTheme({ ...DEFAULT_THEME_GENERATOR_INPUT });
    expect(t.primary[500].toLowerCase()).toBe('#1f6feb');
  });
});

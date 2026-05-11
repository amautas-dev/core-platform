import {
  COLOR_SCALE_STOPS,
  type ColorScale,
  type ColorStop,
  type ThemeFunctionalColors,
  type ThemeTokens,
} from './theme-tokens';

export interface GenerateThemeInput {
  /** Color de marca principal (identidad) */
  primary: string;
  /** Secundario: si es muy neutro (p. ej. crema), el acento se deriva por hue-shift */
  secondary?: string;
  /** Opcional: tercer matiz para futuras extensiones (p. ej. sidebar) */
  tertiary?: string;
}

export interface GenerateThemeOptions {
  /** Desplazamiento de matiz si no hay secundario saturado (grados) */
  accentHueShift?: number;
  /** Overrides de colores funcionales */
  functional?: Partial<ThemeFunctionalColors>;
}

const DEFAULT_FUNCTIONAL: ThemeFunctionalColors = {
  success: '#2e7d32',
  warning: '#f9a825',
  error: '#d32f2f',
  info: '#1565c0',
};

/** Convierte #RRGGBB a HSL (0–360, 0–100, 0–100) */
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const n = normalizeHex(hex);
  if (!n) return { h: 200, s: 50, l: 50 };
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = ((max + min) / 2) * 100;
  const s = d === 0 ? 0 : (d / (1 - Math.abs(2 * (l / 100) - 1))) * 100;
  return { h: Math.round(h), s: Math.round(s * 10) / 10, l: Math.round(l * 10) / 10 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ll - c / 2;
  let rp = 0,
    gp = 0,
    bp = 0;
  const hh = ((h % 360) + 360) % 360;
  if (hh < 60) [rp, gp, bp] = [c, x, 0];
  else if (hh < 120) [rp, gp, bp] = [x, c, 0];
  else if (hh < 180) [rp, gp, bp] = [0, c, x];
  else if (hh < 240) [rp, gp, bp] = [0, x, c];
  else if (hh < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${toHex(rp)}${toHex(gp)}${toHex(bp)}`;
}

export function lighten(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.min(100, l + percent);
  return hslToHex(h, s, nl);
}

export function darken(hex: string, percent: number): string {
  const { h, s, l } = hexToHsl(hex);
  const nl = Math.max(0, l - percent);
  return hslToHex(h, s, nl);
}

function normalizeHex(hex: string): string | null {
  const n = hex.trim().replace(/^#/, '');
  if (n.length === 6 && /^[0-9a-fA-F]+$/.test(n)) return n.toLowerCase();
  return null;
}

export function normalizeHexColor(hex: string, fallback: string): string {
  const n = normalizeHex(hex);
  if (n) return `#${n}`;
  const f = normalizeHex(fallback);
  return f ? `#${f}` : '#1f6feb';
}

/** Heurística: secundarios tipo crema/beige no deben generar escala “acento” saturada */
export function isLowSaturationNeutral(hex: string): boolean {
  return hexToHsl(hex).s < 14;
}

function hueShift(hex: string, degrees: number): string {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex((h + degrees + 360) % 360, s, l);
}

/** Oscurecimiento suave en 600–900 para que el sidebar y el chrome no queden “apagados” vs. el logo. */
const LIGHTNESS_OFFSET: Record<ColorStop, number> = {
  50: 38,
  100: 30,
  200: 22,
  300: 14,
  400: 7,
  500: 0,
  600: -5,
  700: -10,
  800: -16,
  900: -21,
};

function buildPrimaryScale(baseHex: string): ColorScale {
  const normalized = normalizeHexColor(baseHex, '#1f6feb');
  const { h, s, l } = hexToHsl(normalized);
  const scale = {} as ColorScale;
  for (const stop of COLOR_SCALE_STOPS) {
    if (stop === 500) {
      scale[500] = normalized;
      continue;
    }
    const off = LIGHTNESS_OFFSET[stop];
    const nl = Math.min(97, Math.max(6, l + off));
    let sat = s;
    if (stop < 500) {
      sat = Math.max(10, s * (0.42 + (stop / 500) * 0.58));
    } else {
      sat = Math.max(12, s * 0.9);
    }
    scale[stop] = hslToHex(h, sat, nl);
  }
  return scale;
}

/** Neutros con matiz ligado al tono de marca (primario). */
export function generateNeutralFromHue(primaryHue: number): ColorScale {
  const scale = {} as ColorScale;
  const sat = 10;
  const targets: Record<ColorStop, number> = {
    50: 98,
    100: 96,
    200: 91,
    300: 82,
    400: 70,
    500: 58,
    600: 48,
    700: 38,
    800: 26,
    900: 14,
  };
  for (const stop of COLOR_SCALE_STOPS) {
    scale[stop] = hslToHex(primaryHue % 360, sat, targets[stop]);
  }
  return scale;
}

/** `rgba(r,g,b,a)` a partir de #RRGGBB (p. ej. hover de botón outline). */
export function hexToRgba(hex: string, alpha: number): string {
  const n = normalizeHex(hex);
  if (!n) return `rgba(0,0,0,${alpha})`;
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

/** Entrada de marca: primario + acento opcional (layout en {@link resolveSemanticTheme}). */
export interface BrandingThemeInput {
  /** Color primario de marca (obligatorio en UI; aquí con fallback) */
  primaryColor: string;
  /** Acento (badges, links); si falta o es neutro → hue-shift del primario */
  accentColor?: string;
}

/**
 * Genera escalas: primary, accent, neutral (sin escala “secondary” de marca).
 */
export function generateThemeFromBranding(
  input: BrandingThemeInput,
  options: GenerateThemeOptions = {},
): ThemeTokens {
  const primaryHex = normalizeHexColor(input.primaryColor, '#1f6feb');
  const primary = buildPrimaryScale(primaryHex);

  const accRaw = input.accentColor?.trim();
  let accentBase: string;
  if (accRaw && !isLowSaturationNeutral(accRaw)) {
    accentBase = normalizeHexColor(accRaw, primaryHex);
  } else {
    accentBase = hueShift(primaryHex, options.accentHueShift ?? 28);
  }
  const accent = buildPrimaryScale(accentBase);

  const neutral = generateNeutralFromHue(hexToHsl(primaryHex).h);

  const functional: ThemeFunctionalColors = {
    ...DEFAULT_FUNCTIONAL,
    ...options.functional,
  };

  return { primary, accent, neutral, functional };
}

/**
 * Compatibilidad con {@link GenerateThemeInput}: el antiguo `secondary` saturado alimentaba la escala **accent**;
 * el antiguo `tertiary` era acento alternativo. La escala **secondary** nueva se deriva del primario más oscuro en ese caso.
 */
export function generateTheme(input: GenerateThemeInput, options: GenerateThemeOptions = {}): ThemeTokens {
  const primaryHex = normalizeHexColor(input.primary, '#1f6feb');
  const secondaryRaw = input.secondary?.trim();
  const tertiaryRaw = input.tertiary?.trim();

  if (secondaryRaw && !isLowSaturationNeutral(secondaryRaw)) {
    return generateThemeFromBranding({ primaryColor: primaryHex, accentColor: secondaryRaw }, options);
  }
  if (tertiaryRaw && !isLowSaturationNeutral(tertiaryRaw)) {
    return generateThemeFromBranding({ primaryColor: primaryHex, accentColor: tertiaryRaw }, options);
  }
  return generateThemeFromBranding({ primaryColor: primaryHex }, options);
}

/** Oscurece hex multiplicando canales RGB (similar al antiguo darkenHex del servicio) */
export function darkenHexFactor(hex: string, factor: number): string {
  const n = normalizeHex(hex);
  if (!n) return hex;
  const r = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(0, 2), 16) * (1 - factor))));
  const g = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(2, 4), 16) * (1 - factor))));
  const b = Math.max(0, Math.min(255, Math.round(parseInt(n.slice(4, 6), 16) * (1 - factor))));
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function mixHex(hexA: string, hexB: string, weightA: number): string {
  const a = normalizeHex(hexA);
  const b = normalizeHex(hexB);
  if (!a || !b) return hexA;
  const wA = Math.max(0, Math.min(1, weightA));
  const wB = 1 - wA;
  const mix = (i: number) =>
    Math.round(
      parseInt(a.slice(i, i + 2), 16) * wA + parseInt(b.slice(i, i + 2), 16) * wB,
    );
  const to = (v: number) => v.toString(16).padStart(2, '0');
  return `#${to(mix(0))}${to(mix(2))}${to(mix(4))}`;
}

export function mixWithWhite(hex: string, whiteRatio: number): string {
  return mixHex(hex, '#ffffff', 1 - whiteRatio);
}

import { hexToHsl, normalizeHexColor } from './theme-generator';

export interface BrandingColorWarnings {
  primaryTooDark?: boolean;
  accentTooLight?: boolean;
}

/**
 * Heurísticas UX: primario casi negro o acento casi blanco degradan contraste.
 */
export function validateBrandingColors(
  primaryHex: string,
  accentHex?: string | null,
): BrandingColorWarnings {
  const p = normalizeHexColor(primaryHex, '#1f6feb');
  const { l: lP } = hexToHsl(p);
  const out: BrandingColorWarnings = {};
  if (lP < 18) {
    out.primaryTooDark = true;
  }
  if (accentHex?.trim()) {
    const a = normalizeHexColor(accentHex, '#4dd2f0');
    const { l: lA, s: sA } = hexToHsl(a);
    if (lA > 88 && sA < 25) {
      out.accentTooLight = true;
    }
  }
  return out;
}

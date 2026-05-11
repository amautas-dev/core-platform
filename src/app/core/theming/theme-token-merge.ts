import type { ColorScale, ColorStop, ThemeFunctionalColors, ThemeTokens } from './theme-tokens';

import { COLOR_SCALE_STOPS } from './theme-tokens';



/** Subconjunto de ThemeTokens para overrides persistidos (sin mutar el generado). */

export type PartialColorScale = Partial<Record<ColorStop, string>>;

export type PartialThemeTokens = {

  primary?: PartialColorScale;

  accent?: PartialColorScale;

  neutral?: PartialColorScale;

  functional?: Partial<ThemeFunctionalColors>;

};



function cloneColorScale(scale: ColorScale): ColorScale {

  const out = {} as ColorScale;

  for (const stop of COLOR_SCALE_STOPS) {

    out[stop] = scale[stop];

  }

  return out;

}



export function cloneThemeTokens(tokens: ThemeTokens): ThemeTokens {

  return {

    primary: cloneColorScale(tokens.primary),

    accent: cloneColorScale(tokens.accent),

    neutral: cloneColorScale(tokens.neutral),

    functional: { ...tokens.functional },

  };

}



/**

 * Combina la paleta generada con overrides manuales. No muta los argumentos.

 * Cada clave definida en `overrides` reemplaza solo ese token.

 */

export function mergeThemeTokens(

  generated: ThemeTokens,

  overrides: PartialThemeTokens | null | undefined,

): ThemeTokens {

  if (!overrides) return cloneThemeTokens(generated);



  const out = cloneThemeTokens(generated);



  const mergeScale = (base: ColorScale, part: PartialColorScale | undefined): ColorScale => {

    if (!part) return base;

    const next = cloneColorScale(base);

    for (const stop of COLOR_SCALE_STOPS) {

      const v = part[stop];

      if (v != null && String(v).trim() !== '') {

        next[stop] = String(v).trim();

      }

    }

    return next;

  };



  out.primary = mergeScale(out.primary, overrides.primary);

  out.accent = mergeScale(out.accent, overrides.accent);

  out.neutral = mergeScale(out.neutral, overrides.neutral);



  if (overrides.functional) {

    out.functional = { ...out.functional };

    const f = overrides.functional;

    if (f.success != null && f.success.trim()) out.functional.success = f.success.trim();

    if (f.warning != null && f.warning.trim()) out.functional.warning = f.warning.trim();

    if (f.error != null && f.error.trim()) out.functional.error = f.error.trim();

    if (f.info != null && f.info.trim()) out.functional.info = f.info.trim();

  }



  return out;

}



/** Elimina entradas de override que coinciden con el generado actual (limpieza tras regenerar). */

export function pruneRedundantOverrides(

  generated: ThemeTokens,

  overrides: PartialThemeTokens | null | undefined,

): PartialThemeTokens | null {

  if (!overrides) return null;



  const pruneScale = (gen: ColorScale, part: PartialColorScale | undefined): PartialColorScale | undefined => {

    if (!part) return undefined;

    const next: PartialColorScale = {};

    let any = false;

    for (const stop of COLOR_SCALE_STOPS) {

      const v = part[stop];

      if (v == null || !String(v).trim()) continue;

      const t = String(v).trim();

      if (t.toLowerCase() !== gen[stop].toLowerCase()) {

        next[stop] = t;

        any = true;

      }

    }

    return any ? next : undefined;

  };



  const out: PartialThemeTokens = {};

  const p = pruneScale(generated.primary, overrides.primary);

  const a = pruneScale(generated.accent, overrides.accent);

  const n = pruneScale(generated.neutral, overrides.neutral);

  if (p) out.primary = p;

  if (a) out.accent = a;

  if (n) out.neutral = n;



  if (overrides.functional) {

    const gf = generated.functional;

    const of = overrides.functional;

    const nf: Partial<ThemeFunctionalColors> = {};

    if (of.success?.trim() && of.success.trim().toLowerCase() !== gf.success.toLowerCase()) nf.success = of.success.trim();

    if (of.warning?.trim() && of.warning.trim().toLowerCase() !== gf.warning.toLowerCase()) nf.warning = of.warning.trim();

    if (of.error?.trim() && of.error.trim().toLowerCase() !== gf.error.toLowerCase()) nf.error = of.error.trim();

    if (of.info?.trim() && of.info.trim().toLowerCase() !== gf.info.toLowerCase()) nf.info = of.info.trim();

    if (Object.keys(nf).length) out.functional = nf;

  }



  if (!out.primary && !out.accent && !out.neutral && !out.functional) return null;

  return out;

}



/** Normaliza respuesta API (Json) a PartialThemeTokens. Ignora claves legacy `secondary`. */

export function parsePartialThemeTokensFromApi(raw: unknown): PartialThemeTokens | null {

  if (raw == null || raw === '') return null;

  if (typeof raw !== 'object' || Array.isArray(raw)) return null;

  const o = raw as Record<string, unknown>;

  const parseScale = (v: unknown): PartialColorScale | undefined => {

    if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined;

    const s = v as Record<string, unknown>;

    const out: PartialColorScale = {};

    for (const stop of COLOR_SCALE_STOPS) {

      const key = String(stop);

      const val = s[key] ?? s[`${stop}`];

      if (typeof val === 'string' && /^#[0-9a-fA-F]{6}$/.test(val.trim())) {

        out[stop] = val.trim();

      }

    }

    return Object.keys(out).length ? out : undefined;

  };

  const out: PartialThemeTokens = {};

  const p = parseScale(o['primary']);

  const a = parseScale(o['accent']);

  const n = parseScale(o['neutral']);

  if (p) out.primary = p;

  if (a) out.accent = a;

  if (n) out.neutral = n;

  const funcRaw = o['functional'];

  if (funcRaw && typeof funcRaw === 'object' && !Array.isArray(funcRaw)) {

    const f = funcRaw as Record<string, unknown>;

    const nf: Partial<ThemeFunctionalColors> = {};

    for (const k of ['success', 'warning', 'error', 'info'] as const) {

      const v = f[k];

      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) nf[k] = v.trim();

    }

    if (Object.keys(nf).length) out.functional = nf;

  }

  if (!out.primary && !out.accent && !out.neutral && !out.functional) return null;

  return out;

}


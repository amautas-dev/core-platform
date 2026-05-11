import { Injectable } from '@angular/core';
import type { PlatformFeature } from '../../features/platform-features/models/platform-feature.interface';

/** Margen multiplicador por defecto (30 % sobre costo base de features). */
export const DEFAULT_PRICING_MARGIN = 1.3;

/** Desviación &lt; este % vs precio sugerido → alerta “bajo margen”. */
export const PRICING_DEVIATION_LOW_THRESHOLD = -20;

/** Desviación &gt; este % vs precio sugerido → alerta “sobreprecio”. */
export const PRICING_DEVIATION_HIGH_THRESHOLD = 50;

export type PricingDeviationClass = 'low_margin' | 'overpriced' | 'ok' | 'unknown';

@Injectable({ providedIn: 'root' })
export class PricingService {
  /**
   * Margen aplicado al costo base de features por módulo.
   * Reservado para futura configuración global o por producto.
   */
  readonly defaultMargin = DEFAULT_PRICING_MARGIN;

  /**
   * Normaliza ISO 3166-1 alpha-2; si no es válido → undefined (comportamiento sin país).
   */
  private normalizeCountryCode(countryCode?: string | null): string | undefined {
    if (countryCode == null || String(countryCode).trim() === '') return undefined;
    const cc = String(countryCode).trim().toUpperCase().slice(0, 2);
    return /^[A-Z]{2}$/.test(cc) ? cc : undefined;
  }

  /**
   * Add-ons comerciales: no forman parte del costo base por módulo ni del precio sugerido del plan (core).
   */
  isAddonFeature(feature: PlatformFeature): boolean {
    return String(feature.featureType ?? '').trim().toUpperCase() === 'ADDON';
  }

  /**
   * Precio mensual efectivo: override por país si existe y trae `priceMonthly` numérico;
   * si no, `priceMonthly` base de la feature.
   */
  getEffectiveFeatureMonthly(feature: PlatformFeature, countryCode?: string | null): number {
    const cc = this.normalizeCountryCode(countryCode);
    if (cc) {
      const ov = feature.overrides?.[cc];
      if (ov != null) {
        const n = Number(ov.priceMonthly);
        if (Number.isFinite(n) && n >= 0) return n;
      }
    }
    const base = Number(feature.priceMonthly);
    return Number.isFinite(base) && base >= 0 ? base : 0;
  }

  /**
   * Indica si el precio mensual efectivo para el mercado viene del override regional o del catálogo base.
   * Debe mantenerse alineado con {@link getEffectiveFeatureMonthly}.
   */
  getMonthlyPriceSource(feature: PlatformFeature, countryCode?: string | null): 'override' | 'base' {
    const cc = this.normalizeCountryCode(countryCode);
    if (cc) {
      const ov = feature.overrides?.[cc];
      if (ov != null) {
        const n = Number(ov.priceMonthly);
        if (Number.isFinite(n) && n >= 0) return 'override';
      }
    }
    return 'base';
  }

  /**
   * Suma de precios mensuales efectivos (con override regional opcional).
   * **Excluye taxonomía ADDON** (precio independiente; usar {@link getAddonsTotal}).
   */
  getFeatureTotal(features: ReadonlyArray<PlatformFeature>, countryCode?: string | null): number {
    return features
      .filter((f) => !this.isAddonFeature(f))
      .reduce((sum, f) => sum + this.getEffectiveFeatureMonthly(f, countryCode), 0);
  }

  /**
   * Suma mensual de features con taxonomía ADDON (precios de referencia independientes del core).
   */
  getAddonsTotal(features: ReadonlyArray<PlatformFeature>, countryCode?: string | null): number {
    return features
      .filter((f) => this.isAddonFeature(f))
      .reduce((sum, f) => sum + this.getEffectiveFeatureMonthly(f, countryCode), 0);
  }

  /**
   * Precio sugerido de un módulo: suma de priceMonthly de sus features × margen.
   */
  getModuleSuggestedPrice(
    features: ReadonlyArray<PlatformFeature>,
    margin: number = this.defaultMargin,
    countryCode?: string | null,
  ): number {
    const base = this.getFeatureTotal(features, countryCode);
    const m = Number(margin);
    if (!Number.isFinite(m) || m < 0) return base;
    return base * m;
  }

  /**
   * Para cada módulo habilitado: costo de features (sin ADDON) × margen; suma total del plan core.
   */
  getPlanSuggestedPrice(
    planModules: ReadonlyArray<{ enabled: boolean; moduleCode: string | null }>,
    allFeatures: ReadonlyArray<PlatformFeature>,
    margin: number = this.defaultMargin,
    countryCode?: string | null,
  ): number {
    let total = 0;
    for (const mod of planModules) {
      if (!mod.enabled) continue;
      const code = mod.moduleCode != null ? String(mod.moduleCode).trim() : '';
      if (!code) continue;
      const feats = allFeatures.filter((f) => f.moduleCode === code);
      total += this.getModuleSuggestedPrice(feats, margin, countryCode);
    }
    return total;
  }

  /**
   * Costo base del plan (suma de priceMonthly en módulos habilitados), sin margen.
   */
  getPlanBaseCostFromFeatures(
    planModules: ReadonlyArray<{ enabled: boolean; moduleCode: string | null }>,
    allFeatures: ReadonlyArray<PlatformFeature>,
    countryCode?: string | null,
  ): number {
    let total = 0;
    for (const mod of planModules) {
      if (!mod.enabled) continue;
      const code = mod.moduleCode != null ? String(mod.moduleCode).trim() : '';
      if (!code) continue;
      const feats = allFeatures.filter((f) => f.moduleCode === code);
      total += this.getFeatureTotal(feats, countryCode);
    }
    return total;
  }

  /**
   * Costo base mensual por módulo habilitado (suma de features del módulo), sin margen.
   * Orden igual al array `planModules`.
   */
  getPlanModuleBaseCosts(
    planModules: ReadonlyArray<{ enabled: boolean; moduleCode: string | null }>,
    allFeatures: ReadonlyArray<PlatformFeature>,
    countryCode?: string | null,
  ): Array<{ moduleCode: string; baseCost: number }> {
    const out: Array<{ moduleCode: string; baseCost: number }> = [];
    for (const mod of planModules) {
      if (!mod.enabled) continue;
      const code = mod.moduleCode != null ? String(mod.moduleCode).trim() : '';
      if (!code) continue;
      const feats = allFeatures.filter((f) => f.moduleCode === code);
      out.push({ moduleCode: code, baseCost: this.getFeatureTotal(feats, countryCode) });
    }
    return out;
  }

  /**
   * ((current - suggested) / suggested) × 100, o null si no aplica.
   */
  getDeviation(currentPrice: number, suggestedPrice: number): number | null {
    if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) return null;
    if (!Number.isFinite(currentPrice)) return null;
    return ((currentPrice - suggestedPrice) / suggestedPrice) * 100;
  }

  classifyDeviation(deviationPercent: number | null): PricingDeviationClass {
    if (deviationPercent == null || !Number.isFinite(deviationPercent)) return 'unknown';
    if (deviationPercent < PRICING_DEVIATION_LOW_THRESHOLD) return 'low_margin';
    if (deviationPercent > PRICING_DEVIATION_HIGH_THRESHOLD) return 'overpriced';
    return 'ok';
  }
}

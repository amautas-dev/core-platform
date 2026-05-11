import { es } from './translations/es';
import { en } from './translations/en';

const DICTS: Record<string, Record<string, unknown>> = {
  es: es as unknown as Record<string, unknown>,
  en: en as unknown as Record<string, unknown>,
};

/**
 * Get a nested value from an object by dot-separated path (e.g. 'menu.dashboard').
 */
function getByPath(obj: Record<string, unknown>, path: string): unknown {
  if (!path) return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Returns true if the key exists in the dictionary for the given language.
 * Keys are dot-separated paths into the nested translation object.
 */
export function hasTranslation(lang: string, key: string): boolean {
  const dict = DICTS[lang] ?? DICTS['es'];
  const value = getByPath(dict, key);
  return value !== undefined && value !== null && typeof value === 'string';
}

const MISSING_PREFIX = '??';
const MISSING_SUFFIX = '??';

/**
 * Development helper: if the key is missing in the current language dictionary,
 * logs a console warning and returns a highlighted string for the UI.
 * Only active when not in production.
 * @param lang Current language code
 * @param key Translation key
 * @param production Whether the app is in production (disable helper)
 * @returns Display value: "??key??" if missing in dev, otherwise the translated value (caller should pass it)
 */
export function getDisplayValue(
  lang: string,
  key: string,
  production: boolean,
  translatedValue: string
): string {
  if (production) return translatedValue;
  if (hasTranslation(lang, key)) return translatedValue;
  console.warn(`Missing i18n label: ${key}`);
  return `${MISSING_PREFIX}${key}${MISSING_SUFFIX}`;
}

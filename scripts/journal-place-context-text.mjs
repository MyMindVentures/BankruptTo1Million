/** @typedef {{ min?: number; max?: number; preferred_min?: number; preferred_max?: number }} CharacterRange */

/**
 * Truncate prose that slightly exceeds max length at sentence or word boundaries.
 * @param {string} text
 * @param {number} min
 * @param {number} max
 * @param {number} [softMargin=50]
 */
export function clampLocalizedProse(text, min, max, softMargin = 50) {
  const trimmed = String(text ?? '').trim();
  if (trimmed.length >= min && trimmed.length <= max) return trimmed;
  if (trimmed.length < min) {
    throw new Error(`Text too short: ${trimmed.length}; minimum ${min}`);
  }
  if (trimmed.length > max + softMargin) {
    throw new Error(`Text too long: ${trimmed.length}; maximum ${max}`);
  }

  const slice = trimmed.slice(0, max);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.endsWith('.') ? slice.length - 1 : -1,
    slice.endsWith('!') ? slice.length - 1 : -1,
    slice.endsWith('?') ? slice.length - 1 : -1,
  );
  if (sentenceEnd >= min - 1) {
    return slice.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= min) {
    return slice.slice(0, lastSpace).trim();
  }

  return slice.trim();
}

/**
 * @param {Record<string, unknown>} defaults
 * @param {Record<string, CharacterRange> | undefined} byLanguage
 * @param {string} lang
 */
export function resolveCharacterRange(defaults, byLanguage, lang) {
  const merged = { ...defaults, ...(byLanguage?.[lang] ?? {}) };
  const min = Number(merged.min ?? 0);
  const max = Number(merged.max ?? min);
  const preferredMin = Number(merged.preferred_min ?? min);
  const preferredMax = Number(merged.preferred_max ?? max);
  return { min, max, preferredMin, preferredMax };
}

/**
 * @param {string} text
 * @param {number} min
 * @param {number} max
 * @param {string} field
 * @param {string} lang
 * @param {number} [softMargin=50]
 */
export function normalizeLocalizedField(text, min, max, field, lang, softMargin = 50) {
  try {
    return clampLocalizedProse(text, min, max, softMargin);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid ${field} length for ${lang}: ${String(text ?? '').trim().length}; expected ${min}-${max} (${message})`);
  }
}

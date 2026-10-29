import { PortionUnit } from '../types';

// Same list the backend accepts (utils/portion.js there).
export const PORTION_UNITS: PortionUnit[] = ['pc', 'gm', 'kg', 'ml', 'ltr'];

const MAX_PORTION_VALUE = 99999.99;
const PORTION_RE = /^\d{1,5}(\.\d{1,2})?$/;

export type PortionInput =
  /** Both left empty: no portion. */
  | { kind: 'none' }
  | { kind: 'ok'; value: number; unit: PortionUnit }
  | { kind: 'invalid'; message: string };

/**
 * Reads the quantity box + unit chips. A portion is a number AND a unit, or
 * neither — the backend answers 400 to half of one, so the form says so first.
 */
export function readPortion(valueText: string, unit: PortionUnit | null): PortionInput {
  const text = valueText.trim();
  if (!text && !unit) return { kind: 'none' };
  if (!text || !unit) return { kind: 'invalid', message: 'Enter both a quantity and a unit, or leave both empty.' };
  const value = Number(text);
  if (!PORTION_RE.test(text) || !(value > 0) || value > MAX_PORTION_VALUE) {
    return { kind: 'invalid', message: 'Quantity must be more than 0 (up to 99999.99, two decimals at most).' };
  }
  return { kind: 'ok', value, unit };
}

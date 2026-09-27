/** Rounds to paise so float sums never show as 18.500000000000004. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "₹310" for whole rupees, "₹18.50" when there are paise. */
export function formatMoney(n: number): string {
  const v = round2(n);
  return Number.isInteger(v) ? `₹${v}` : `₹${v.toFixed(2)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "21 Sep 2026" — for documents like invoices. */
export function formatFullDate(input: string | number | Date | null | undefined): string {
  if (input == null) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Today" or "21 Aug". */
export function formatDay(input: string | number | Date | null | undefined): string {
  if (input == null) return '';
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
  return sameDay ? 'Today' : `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "8:04 PM" — formatted by hand so it doesn't depend on the JS engine's Intl support. */
export function formatClock(input: string | number | Date | null | undefined): string | null {
  if (input == null) return null;
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return null;
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

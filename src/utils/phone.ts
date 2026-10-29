/**
 * Turns what was typed or pasted into the 10-digit number the backend wants.
 *
 * Typing arrives one digit at a time (a stray 11th digit is ignored). A paste or
 * autofill such as "+91 98765 43210" or "098765 43210" is longer than a number, so
 * the LAST 10 digits are kept — keeping the first 10 would quietly send the code to
 * a different, wrong number.
 *
 * @param text     the field's new text
 * @param previous the digits already in the field
 */
export function readPhoneInput(text: string, previous: string): string {
  const digits = text.replace(/\D/g, '');
  if (digits.length <= 10) return digits;
  const typedOneMoreDigit = text.length === previous.length + 1;
  return typedOneMoreDigit ? previous : digits.slice(-10);
}

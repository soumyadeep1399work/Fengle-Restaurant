/** Strip everything but digits (people paste numbers with spaces or dashes). */
export function normalizeAccountNumber(v: string): string {
  return v.replace(/\D/g, '').slice(0, 18);
}

export function normalizeIfsc(v: string): string {
  return v.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11);
}

export function normalizeUpi(v: string): string {
  return v.replace(/\s/g, '');
}

const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const UPI_RE = /^[\w.\-]{2,256}@[A-Za-z]{2,64}$/;

export interface BankForm {
  holderName: string;
  accountNumber: string;
  confirmNumber: string;
  ifsc: string;
  upiId: string;
}

/** The first problem with the form, in words a kitchen owner understands; '' when it is good to send. Mirrors the server's rules. */
export function validateBankForm(f: BankForm): string {
  const name = f.holderName.trim();
  if (name.length < 2) return 'Enter the account holder’s name exactly as it is on the passbook.';
  if (f.accountNumber.length < 9 || f.accountNumber.length > 18) return 'The account number should be 9 to 18 digits.';
  if (f.accountNumber !== f.confirmNumber) return 'The two account numbers don’t match.';
  if (!IFSC_RE.test(f.ifsc)) return 'The IFSC code looks wrong. It is 11 characters, like SBIN0001234 (the fifth one is a zero).';
  if (f.upiId && !UPI_RE.test(f.upiId)) return 'The UPI ID should look like name@bank.';
  return '';
}

export function maskedNumber(last4: string): string {
  return `•••• ${last4}`;
}

/**
 * Phone number normalization and formatting utilities.
 * Ensures consistent E.164 standard formatting across all recipient and endpoint forms.
 */

export function normalizePhoneE164(input: string): string {
  if (!input) return '';

  const cleaned = input.trim();
  const digits = cleaned.replace(/\D/g, '');

  if (!digits) return '';

  // 10 digits without country code (e.g. 3057537770 or +3057537770 from legacy bug):
  // US/Canada NANP number -> prepend +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11 digits starting with 1 (e.g. 13057537770 or +13057537770)
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If already explicitly starts with + and has international length (11-15 digits)
  if (cleaned.startsWith('+')) {
    return `+${digits}`;
  }

  // Fallback: prepend + to digits
  return `+${digits}`;
}

export function isValidPhoneE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

export function formatPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');

  // US/Canada: 1 + 10 digits
  if (digits.length === 11 && digits.startsWith('1')) {
    const area = digits.slice(1, 4);
    const mid = digits.slice(4, 7);
    const last = digits.slice(7, 11);
    return `+1 (${area}) ${mid}-${last}`;
  }

  // 10 digits
  if (digits.length === 10) {
    const area = digits.slice(0, 3);
    const mid = digits.slice(3, 6);
    const last = digits.slice(6, 10);
    return `(${area}) ${mid}-${last}`;
  }

  return phone;
}

// Telefón na porovnávanie: len číslice v medzinárodnom tvare.
// "0905 111 222", "+421905111222" aj "00421 905..." dajú rovnaké "421905111222".
// Rovnaké pravidlá používa SQL doplnenie v migrácii customer_phone_normalized.
export function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return `421${digits.slice(1)}`;
  return digits;
}

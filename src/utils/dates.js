export function getTodayString() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}

// dd-mm-yyyy (UI) -> YYYY-MM-DD (API). Returns null for empty, undefined for invalid.
export function toApiDate(value) {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return undefined;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

// YYYY-MM-DD or ISO datetime (API) -> dd-mm-yyyy (UI). Returns '' for empty/invalid.
export function fromApiDate(value) {
  if (!value) return '';
  const m = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return '';
  const [, yyyy, mm, dd] = m;
  return `${dd}-${mm}-${yyyy}`;
}

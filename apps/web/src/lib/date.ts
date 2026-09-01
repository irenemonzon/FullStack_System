// Guests' birth dates are entered as DD/MM/YY (per the Figma wireframes),
// but a 4-digit year (DD/MM/YYYY) is also accepted since most guests are
// adults and a full birth year is less error-prone to type than 2 digits.
// Stored/sent as ISO (YYYY-MM-DD). Returns undefined if the input doesn't
// look like a full date yet, so callers can just omit the field rather
// than send a malformed date to the API.
export function parseDDMMYYToISO(input: string): string | undefined {
  const match = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/.exec(input.trim());
  if (!match) return undefined;
  const [, dd, mm, yy] = match;
  const year = yy.length === 4 ? yy : Number(yy) <= 30 ? `20${yy}` : `19${yy}`;
  return `${year}-${mm}-${dd}`;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "no previous visits";
  const then = new Date(iso).getTime();
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "last visit today";
  if (days === 1) return "last visit 1 day ago";
  if (days < 14) return `last visit ${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 8) return `last visit ${weeks} wks ago`;
  const months = Math.floor(days / 30);
  return `last visit ${months} mo ago`;
}

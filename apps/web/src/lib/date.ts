import { format, isAfter, isValid, parse } from "date-fns";

// Guests' birth dates are entered and shown as DD/MM/YYYY, but stored and
// sent to the API as ISO (YYYY-MM-DD).
export const BIRTH_DATE_FORMAT = "dd/MM/yyyy";
export const EARLIEST_BIRTH_DATE = new Date(1900, 0, 1);

// Returns undefined unless the input is a real, non-future calendar date in
// DD/MM/YYYY — strict parsing rejects e.g. 31/02/1990 rather than rolling it
// over into March.
export function parseBirthDate(input: string): string | undefined {
  const trimmed = input.trim();
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) return undefined;
  const date = parse(trimmed, BIRTH_DATE_FORMAT, new Date());
  if (!isValid(date) || isAfter(date, new Date()) || date < EARLIEST_BIRTH_DATE) return undefined;
  return format(date, "yyyy-MM-dd");
}

export function formatBirthDate(iso: string): string {
  return format(parse(iso, "yyyy-MM-dd", new Date()), BIRTH_DATE_FORMAT);
}

export const BIRTH_DATE_ERROR = "Birth date should be a real date in DD/MM/YYYY, e.g. 05/09/1985";

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

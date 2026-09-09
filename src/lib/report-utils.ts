/**
 * Shared utility functions for admin report API routes
 */

/**
 * Escapes special regex characters in a string to safely use in MongoDB $regex queries as a literal substring match.
 */
export function escapeRegex(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Safely parses and coerces pagination parameters from URLSearchParams.
 * Guarantees valid numeric page (>= 1), limit (>= 1 and <= maxLimit), and calculated skip.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = 25,
  maxLimit: number = 100
): { page: number; limit: number; skip: number } {
  const rawPage = parseInt(searchParams.get('page') ?? '1', 10);
  const rawLimit = parseInt(searchParams.get('limit') ?? String(defaultLimit), 10);

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(maxLimit, Math.floor(rawLimit))
      : defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

/**
 * Parses from and to date strings into UTC date bounds.
 */
export function parseUtcDateRange(
  from: string | null,
  to: string | null
): Record<string, Date> {
  const filter: Record<string, Date> = {};
  const hasTimezoneOffset = (str: string) => /([zZ]|[+-]\d{2}(?::?\d{2})?)$/.test(str.trim());

  if (from) {
    const trimmed = from.trim();
    const fromStr = !trimmed.includes('T')
      ? `${trimmed}T00:00:00.000Z`
      : hasTimezoneOffset(trimmed)
      ? trimmed
      : `${trimmed}Z`;
    const fromDate = new Date(fromStr);
    if (!isNaN(fromDate.getTime())) filter.$gte = fromDate;
  }
  if (to) {
    const trimmed = to.trim();
    const toStr = !trimmed.includes('T')
      ? `${trimmed}T23:59:59.999Z`
      : hasTimezoneOffset(trimmed)
      ? trimmed
      : `${trimmed}Z`;
    const toDate = new Date(toStr);
    if (!isNaN(toDate.getTime())) filter.$lte = toDate;
  }
  return filter;
}

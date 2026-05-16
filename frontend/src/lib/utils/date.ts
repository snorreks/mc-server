/**
 * Convert a Date to a human-readable relative string.
 * Simple implementation without moment.js dependency.
 */
export function toCalendar(
  date:
    | Date
    | { seconds?: number; nanoseconds?: number }
    | { _seconds?: number; _nanoseconds?: number }
    | { toDate: () => Date },
): string {
  // Normalise into a Date from various input shapes
  let d: Date;
  if (date instanceof Date) {
    d = date;
  } else if (typeof (date as { toDate: () => Date }).toDate === 'function') {
    d = (date as { toDate: () => Date }).toDate();
  } else {
    const maybe = date as { _seconds?: number; seconds?: number };
    const secs = maybe._seconds ?? maybe.seconds ?? 0;
    d = new Date(Number(secs) * 1000);
  }

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

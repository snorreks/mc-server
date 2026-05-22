// shared/utils.ts — shared utilities imported by frontend, backend, and scripts.

/** Parse the RCON `list` command output into player names. */
export function parsePlayerList(text: string): string[] {
  const match = text.match(/There are \d+ of a max of \d+ players online[:\s]*(.*)/i);
  if (!match?.[1]) return [];
  return match[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Convert various timestamp formats (Date, Firestore Timestamp) to milliseconds. */
export function toMs(
  d: Date | { toMillis?: () => number; _seconds?: number; seconds?: number } | undefined | null,
): number {
  if (!d) return 0;
  if (typeof (d as Date).getTime === 'function') return (d as Date).getTime();
  if (typeof (d as { toMillis: () => number }).toMillis === 'function')
    return (d as { toMillis: () => number }).toMillis();
  const maybe = d as { _seconds?: number; seconds?: number };
  const secs = maybe._seconds ?? maybe.seconds ?? 0;
  return secs * 1000;
}

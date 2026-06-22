export function peso(amount: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function dateTime(d: Date | string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

export function dateShort(d: Date | string | null): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(
    new Date(d)
  );
}

/** Compact campaign run window, e.g. "Jun 19 – Jul 3, 2026". */
export function dateRange(start: Date | string | null, end: Date | string | null): string {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const sameYear = s.getFullYear() === e.getFullYear();
  const startFmt = new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(s);
  const endFmt = new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", year: "numeric" }).format(e);
  return `${startFmt} – ${endFmt}`;
}

/** Whole-day count between two dates, inclusive of the start day. */
export function durationDays(start: Date | string | null, end: Date | string | null): number {
  if (!start || !end) return 0;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(1, Math.round(ms / 86_400_000));
}

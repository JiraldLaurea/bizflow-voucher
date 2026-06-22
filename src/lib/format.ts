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

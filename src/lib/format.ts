/**
 * Display formatting. DESIGN.md §13.1: factory local time (Asia/Colombo), 24-hour,
 * like "5 Oct 2026, 14:32". Data is stored in UTC; only display is converted.
 */
export const FACTORY_TIME_ZONE = "Asia/Colombo";

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: FACTORY_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: FACTORY_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: FACTORY_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function partsMap(fmt: Intl.DateTimeFormat, d: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(d)) out[p.type] = p.value;
  return out;
}

/** "5 Oct 2026, 14:32" or the fallback when the value is missing/invalid. */
export function formatDateTime(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  const p = partsMap(dateTimeFormatter, d);
  return `${p.day} ${p.month} ${p.year}, ${p.hour}:${p.minute}`;
}

export const formatFactoryDateTime = formatDateTime;


/** "5 Oct 2026" */
export function formatDate(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  const p = partsMap(dateFormatter, d);
  return `${p.day} ${p.month} ${p.year}`;
}

/** "14:32" */
export function formatTime(value: string | Date | null | undefined, fallback = "—"): string {
  const d = toDate(value);
  if (!d) return fallback;
  const p = partsMap(timeFormatter, d);
  return `${p.hour}:${p.minute}`;
}

/** Compact duration: "just now", "12 m", "2 h 14 m", "3 d 4 h". */
export function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(Math.max(0, ms) / 60000);
  if (totalMinutes < 1) return "just now";
  if (totalMinutes < 60) return `${totalMinutes} m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return minutes ? `${hours} h ${minutes} m` : `${hours} h`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return remHours ? `${days} d ${remHours} h` : `${days} d`;
}

/** "12 m ago" style label; "just now" under a minute. */
export function formatRelative(
  value: string | Date | null | undefined,
  now: number = Date.now(),
  fallback = "—"
): string {
  const d = toDate(value);
  if (!d) return fallback;
  const text = formatDuration(now - d.getTime());
  return text === "just now" ? text : `${text} ago`;
}

/** Fabric yards with exactly two decimals. */
export function formatYards(value: number | string | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : fallback;
}

/** Percentage with two decimals. `signed` adds "+" for positives. */
export function formatPct(
  value: number | string | null | undefined,
  opts: { signed?: boolean; digits?: number; fallback?: string } = {}
): string {
  const { signed = false, digits = 2, fallback = "—" } = opts;
  if (value === null || value === undefined || value === "") return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  const body = n.toFixed(digits);
  return signed && n > 0 ? `+${body} %` : `${body} %`;
}

/** Whole-number quantity with thousands separators. */
export function formatQty(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return fallback;
  return new Intl.NumberFormat("en-US").format(value);
}

/** Signed variance: +2, −3 (true minus), 0. */
export function formatVariance(value: number | null | undefined, fallback = "—"): string {
  if (value === null || value === undefined) return fallback;
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return "0";
}

export interface OrderNoParts {
  /** Dimmed part: prefix and zero padding, e.g. "CUT-0000". */
  lead: string;
  /** Significant digits, e.g. "42". Empty when the number is not in CUT-nnnnnn form. */
  significant: string;
}

/** Splits `CUT-000042` into dimmed padding and significant digits. */
export function splitOrderNo(orderNo: string): OrderNoParts {
  const m = /^(CUT-)(0*)(\d+)$/.exec(orderNo);
  if (!m) return { lead: "", significant: orderNo };
  return { lead: `${m[1]}${m[2]}`, significant: m[3] };
}

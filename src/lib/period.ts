/**
 * Rangos de fechas para mirar las ventas de cerca o de lejos: un día, una
 * semana, un mes, un año.
 *
 * Las cuentas se hacen en UTC sobre cadenas "YYYY-MM-DD" porque una fecha de
 * venta es un día de calendario, no un instante: construirla con `new Date(...)`
 * a secas la interpreta en la zona del navegador y en Caracas la corre un día
 * para atrás.
 */

export type PeriodKind = "dia" | "semana" | "mes" | "anio";

export const PERIOD_KINDS: { value: PeriodKind; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
  { value: "anio", label: "Año" },
];

export interface Period {
  kind: PeriodKind;
  /** El día que ancla el período. Siempre es el primero del rango. */
  anchor: string;
  from: string;
  to: string;
  /** Cómo se nombra el rango: "agosto 2026", "11 – 17 ago 2026". */
  label: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isPeriodKind(value: unknown): value is PeriodKind {
  return PERIOD_KINDS.some((k) => k.value === value);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && DATE_RE.test(value);
}

function parse(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86_400_000);
}

/** El día de hoy en formato ISO, para anclar los períodos por defecto. */
export function today(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function fmt(date: string, options: Intl.DateTimeFormatOptions): string {
  return parse(date).toLocaleDateString("es-VE", { timeZone: "UTC", ...options });
}

function label(kind: PeriodKind, from: string, to: string): string {
  if (kind === "dia") {
    return fmt(from, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  }
  if (kind === "semana") {
    // El año va una sola vez, al final, salvo que la semana cruce de diciembre
    // a enero y las dos puntas no sean del mismo.
    const sameYear = from.slice(0, 4) === to.slice(0, 4);
    const start = fmt(from, {
      day: "numeric",
      month: "short",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    const end = fmt(to, { day: "numeric", month: "short", year: "numeric" });
    return `${start} – ${end}`;
  }
  if (kind === "mes") {
    return fmt(from, { month: "long", year: "numeric" });
  }
  return from.slice(0, 4);
}

/**
 * El rango que cubre un período, a partir de cualquier día que caiga dentro.
 * El ancla que devuelve es el primer día del rango, así que dos fechas de la
 * misma semana dan el mismo período y la URL queda estable.
 */
export function resolvePeriod(kind: PeriodKind, anchor: string): Period {
  const date = isIsoDate(anchor) ? parse(anchor) : parse(today());

  let from: Date;
  let to: Date;

  if (kind === "dia") {
    from = date;
    to = date;
  } else if (kind === "semana") {
    // La semana arranca el lunes: `getUTCDay()` da 0 el domingo, así que se
    // rota para que el lunes quede en 0.
    const offset = (date.getUTCDay() + 6) % 7;
    from = addDays(date, -offset);
    to = addDays(from, 6);
  } else if (kind === "mes") {
    from = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    to = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  } else {
    from = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    to = new Date(Date.UTC(date.getUTCFullYear(), 11, 31));
  }

  const fromIso = iso(from);
  const toIso = iso(to);
  return { kind, anchor: fromIso, from: fromIso, to: toIso, label: label(kind, fromIso, toIso) };
}

/** El período de al lado: −1 es el anterior, +1 el siguiente. */
export function shiftPeriod(period: Period, delta: number): Period {
  const start = parse(period.from);
  let next: Date;

  if (period.kind === "dia") next = addDays(start, delta);
  else if (period.kind === "semana") next = addDays(start, delta * 7);
  else if (period.kind === "mes") {
    next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + delta, 1));
  } else {
    next = new Date(Date.UTC(start.getUTCFullYear() + delta, 0, 1));
  }

  return resolvePeriod(period.kind, iso(next));
}

export type Profile = {
  cigarettesPerDay: number;
  packPriceCents: number;
  packSize: number;
  timeZone: string;
  startedOn: string;
};

export type DayLog = {
  date: string;
  count: number;
  confirmed: boolean;
  baseline: number;
  packPriceCents: number;
  packSize: number;
};

export type TrackerData = { profile: Profile; logs: DayLog[]; today: string };
export type ActionResult = { data?: TrackerData; error?: string };

export function dateInZone(timeZone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Calendar arithmetic uses UTC noon, independently of daylight saving changes.
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

export function formatDate(
  date: string,
  options?: Intl.DateTimeFormatOptions,
  locale: "it" | "en" = "it",
) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    day: "numeric",
    month: "long",
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function euro(cents: number, locale: "it" | "en" = "it") {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function getStats(logs: DayLog[], today: string) {
  const confirmed = logs.filter((log) => log.confirmed && log.date <= today);
  const smokeFree = confirmed.filter((log) => log.count === 0).length;
  const avoided = confirmed.reduce(
    (sum, log) => sum + log.baseline - log.count,
    0,
  );
  const savedCents = confirmed.reduce(
    (sum, log) =>
      sum + ((log.baseline - log.count) * log.packPriceCents) / log.packSize,
    0,
  );
  const byDate = new Map(confirmed.map((log) => [log.date, log]));
  // A still-open today doesn't break a streak earned through yesterday.
  let cursor = byDate.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (byDate.get(cursor)?.count === 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return {
    smokeFree,
    avoided: Math.max(0, avoided),
    savedCents: Math.max(0, Math.round(savedCents)),
    streak,
    confirmedDays: confirmed.length,
  };
}

export function heatLevel(log?: DayLog) {
  if (!log?.confirmed) return 0;
  if (log.count === 0) return 4;
  const reduction = 1 - log.count / log.baseline;
  if (reduction >= 0.5) return 3;
  if (reduction > 0) return 2;
  return 1;
}

export function calendarDates(
  today: string,
  weeks: number,
  firstEntry = today,
) {
  const monday = (date: string) => {
    const weekday = (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
    return addDays(date, -weekday);
  };
  const firstWeek = monday(firstEntry);
  const latestStart = addDays(monday(today), -(weeks - 1) * 7);
  // Start at the first real entry and extend forward. Once that period is
  // full, keep the current week within the selected 6/12-month window.
  const start = firstWeek > latestStart ? firstWeek : latestStart;
  return Array.from({ length: weeks * 7 }, (_, index) => addDays(start, index));
}

export function validDay(
  date: unknown,
  start: string,
  today: string,
): date is string {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === date &&
    date >= start &&
    date <= today
  );
}

export function parseSettings(input: {
  cigarettesPerDay: number;
  packPrice: number;
  packSize: number;
  timeZone: string;
}) {
  if (
    !Number.isInteger(input.cigarettesPerDay) ||
    input.cigarettesPerDay < 1 ||
    input.cigarettesPerDay > 100
  )
    throw new Error("Inserisci un consumo giornaliero tra 1 e 100 sigarette.");
  if (
    !Number.isFinite(input.packPrice) ||
    input.packPrice < 0.1 ||
    input.packPrice > 100
  )
    throw new Error("Inserisci un prezzo del pacchetto tra 0,10 € e 100 €.");
  if (
    !Number.isInteger(input.packSize) ||
    input.packSize < 1 ||
    input.packSize > 100
  )
    throw new Error("Inserisci tra 1 e 100 sigarette per pacchetto.");
  if (
    typeof input.timeZone !== "string" ||
    !input.timeZone ||
    input.timeZone.length > 100
  )
    throw new Error("Il fuso orario non è valido.");
  try {
    dateInZone(input.timeZone);
  } catch {
    throw new Error("Il fuso orario non è valido.");
  }
  return {
    cigarettesPerDay: input.cigarettesPerDay,
    packPriceCents: Math.round(input.packPrice * 100),
    packSize: input.packSize,
    timeZone: input.timeZone,
  };
}

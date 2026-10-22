"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyLogs, profiles } from "@/db/schema";
import {
  currentProfile,
  hashToken,
  SESSION_COOKIE,
  trackerData,
} from "@/lib/session";
import {
  dateInZone,
  parseSettings,
  validDay,
  type ActionResult,
} from "@/lib/tracker";

export async function saveSettings(input: {
  cigarettesPerDay: number;
  packPrice: number;
  packSize: number;
  timeZone: string;
}): Promise<ActionResult> {
  let settings;
  try {
    settings = parseSettings(input);
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : "Controlla i valori inseriti.",
    };
  }

  const existing = await currentProfile();
  if (existing) {
    // Preserve the calendar timezone and all historical daily snapshots.
    const profile = getDb()
      .update(profiles)
      .set({ ...settings, timeZone: existing.timeZone })
      .where(eq(profiles.id, existing.id))
      .returning()
      .get();
    revalidatePath("/", "layout");
    return { data: trackerData(profile) };
  }

  const token = randomBytes(32).toString("hex");
  const profile = getDb()
    .insert(profiles)
    .values({
      ...settings,
      id: hashToken(token),
      startedOn: dateInZone(settings.timeZone),
    })
    .returning()
    .get();
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/", "layout");
  return { data: trackerData(profile) };
}

export async function recordDay(input: {
  date: string;
  operation: "increment" | "decrement" | "confirm";
  count?: number;
}): Promise<ActionResult> {
  const profile = await currentProfile();
  if (!profile)
    return { error: "La sessione è scaduta. Ricarica la pagina per iniziare." };
  const today = dateInZone(profile.timeZone);
  if (!validDay(input.date, profile.startedOn, today))
    return {
      error: "Scegli una data compresa tra l’inizio del percorso e oggi.",
    };
  if (!["increment", "decrement", "confirm"].includes(input.operation))
    return { error: "Operazione non valida." };
  if (input.operation !== "confirm" && input.date !== today)
    return { error: "Usa il diario per correggere una giornata passata." };
  if (
    input.operation === "confirm" &&
    (!Number.isInteger(input.count) || input.count! < 0 || input.count! > 200)
  )
    return { error: "Inserisci un numero intero tra 0 e 200." };

  getDb().transaction((tx) => {
    const where = and(
      eq(dailyLogs.profileId, profile.id),
      eq(dailyLogs.date, input.date),
    );
    const existing = tx.select().from(dailyLogs).where(where).get();
    const count =
      input.operation === "confirm"
        ? input.count!
        : Math.max(
            0,
            Math.min(
              200,
              (existing?.count ?? 0) +
                (input.operation === "increment" ? 1 : -1),
            ),
          );
    tx.insert(dailyLogs)
      .values({
        profileId: profile.id,
        date: input.date,
        count,
        confirmed: input.operation === "confirm",
        baseline: profile.cigarettesPerDay,
        packPriceCents: profile.packPriceCents,
        packSize: profile.packSize,
      })
      .onConflictDoUpdate({
        target: [dailyLogs.profileId, dailyLogs.date],
        set: {
          count,
          confirmed: input.operation === "confirm",
          // Historical baseline and costs are intentionally not updated.
        },
      })
      .run();
  });
  return { data: trackerData(profile) };
}

export async function refreshTracker(): Promise<ActionResult> {
  const profile = await currentProfile();
  return profile
    ? { data: trackerData(profile) }
    : { error: "Sessione non disponibile." };
}

export async function resetJourney(input: {
  confirmed: boolean;
}): Promise<ActionResult> {
  if (input?.confirmed !== true)
    return { error: "Conferma il reset del percorso per continuare." };
  const profile = await currentProfile();
  if (!profile)
    return { error: "La sessione è scaduta. Ricarica la pagina per iniziare." };

  const updated = getDb().transaction((tx) => {
    tx.delete(dailyLogs).where(eq(dailyLogs.profileId, profile.id)).run();
    return tx
      .update(profiles)
      .set({ startedOn: dateInZone(profile.timeZone) })
      .where(eq(profiles.id, profile.id))
      .returning()
      .get();
  });
  revalidatePath("/", "layout");
  return { data: trackerData(updated) };
}

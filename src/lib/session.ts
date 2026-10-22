import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { profiles, dailyLogs } from "@/db/schema";
import { dateInZone, type TrackerData } from "./tracker";

export const SESSION_COOKIE = "quit-smoking-session";
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function currentProfile() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    getDb()
      .select()
      .from(profiles)
      .where(eq(profiles.id, hashToken(token)))
      .get() ?? null
  );
}

export function trackerData(
  profile: typeof profiles.$inferSelect,
): TrackerData {
  const logs = getDb()
    .select({
      date: dailyLogs.date,
      count: dailyLogs.count,
      confirmed: dailyLogs.confirmed,
      baseline: dailyLogs.baseline,
      packPriceCents: dailyLogs.packPriceCents,
      packSize: dailyLogs.packSize,
    })
    .from(dailyLogs)
    .where(eq(dailyLogs.profileId, profile.id))
    .orderBy(dailyLogs.date)
    .all();
  const { id: _id, ...publicProfile } = profile;
  void _id;
  return { profile: publicProfile, logs, today: dateInZone(profile.timeZone) };
}

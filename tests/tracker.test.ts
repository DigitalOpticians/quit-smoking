import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { and, eq } from "drizzle-orm";
import { dailyLogs, profiles } from "../src/db/schema";
import {
  addDays,
  calendarDates,
  dateInZone,
  getStats,
  heatLevel,
  parseSettings,
  validDay,
  type DayLog,
} from "../src/lib/tracker";

const log = (date: string, count: number, confirmed = true): DayLog => ({
  date,
  count,
  confirmed,
  baseline: 10,
  packPriceCents: 600,
  packSize: 20,
});

test("missing and unconfirmed days do not create savings or smoke-free days", () => {
  const stats = getStats(
    [log("2026-10-20", 0), log("2026-10-21", 0, false)],
    "2026-10-22",
  );
  assert.equal(stats.smokeFree, 1);
  assert.equal(stats.confirmedDays, 1);
  assert.equal(stats.avoided, 10);
  assert.equal(stats.savedCents, 300);
  assert.equal(stats.streak, 0);
});

test("streak spans yesterday while today is open and breaks on a gap or smoking", () => {
  const logs = [
    log("2026-10-19", 0),
    log("2026-10-20", 0),
    log("2026-10-21", 0),
  ];
  assert.equal(getStats(logs, "2026-10-22").streak, 3);
  assert.equal(
    getStats([...logs, log("2026-10-22", 1)], "2026-10-22").streak,
    0,
  );
  assert.equal(getStats([logs[0], logs[2]], "2026-10-22").streak, 1);
});

test("savings use each day's own baseline and price, including days over baseline", () => {
  const logs = [
    log("2026-10-20", 5),
    { ...log("2026-10-21", 18), baseline: 20, packPriceCents: 800 },
    log("2026-10-22", 11),
  ];
  const stats = getStats(logs, "2026-10-22");
  assert.equal(stats.avoided, 6);
  assert.equal(stats.savedCents, 200);
  assert.equal(getStats([log("2026-10-22", 15)], "2026-10-22").savedCents, 0);
});

test("calendar handles daylight saving, leap dates and timezone midnight", () => {
  assert.equal(addDays("2026-10-25", 1), "2026-10-26");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(
    dateInZone("Europe/Rome", new Date("2026-10-21T23:30:00Z")),
    "2026-10-22",
  );
  const dates = calendarDates("2026-10-22", 26);
  assert.equal(dates.length, 182);
  assert.equal(new Date(`${dates[0]}T12:00:00Z`).getUTCDay(), 1);
  assert.equal(new Date(`${dates.at(-1)}T12:00:00Z`).getUTCDay(), 0);
  assert.ok(dates.includes("2026-10-22"));
  assert.equal(validDay("2026-02-30", "2026-01-01", "2026-10-22"), false);
  assert.equal(validDay("2026-10-23", "2026-10-20", "2026-10-22"), false);
  assert.equal(validDay("2026-10-19", "2026-10-20", "2026-10-22"), false);
});

test("heatmap distinguishes a draft, no improvement, reduction, and zero", () => {
  assert.equal(heatLevel(), 0);
  assert.equal(heatLevel(log("2026-10-22", 0, false)), 0);
  assert.equal(heatLevel(log("2026-10-22", 12)), 1);
  assert.equal(heatLevel(log("2026-10-22", 8)), 2);
  assert.equal(heatLevel(log("2026-10-22", 4)), 3);
  assert.equal(heatLevel(log("2026-10-22", 0)), 4);
});

test("server settings validation rejects invalid numbers and timezones", () => {
  const settings = {
    cigarettesPerDay: 10,
    packPrice: 6.2,
    packSize: 20,
    timeZone: "Europe/Rome",
  };
  assert.equal(parseSettings(settings).packPriceCents, 620);
  for (const cigarettesPerDay of [0, -1, 101, 1.5, NaN, Infinity])
    assert.throws(() => parseSettings({ ...settings, cigarettesPerDay }));
  for (const packPrice of [0, -1, 101, NaN, Infinity])
    assert.throws(() => parseSettings({ ...settings, packPrice }));
  assert.throws(() => parseSettings({ ...settings, packSize: 0 }));
  assert.throws(() => parseSettings({ ...settings, timeZone: "invalid" }));
});

test("SQLite migrations persist isolated profiles and unique per-day records", () => {
  const directory = mkdtempSync(join(tmpdir(), "quit-smoking-test-"));
  const path = join(directory, "test.sqlite");
  const sqlite = new Database(path);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite);
  try {
    migrate(db, { migrationsFolder: "./drizzle" });
    const values = {
      cigarettesPerDay: 10,
      packPriceCents: 600,
      packSize: 20,
      timeZone: "Europe/Rome",
      startedOn: "2026-10-22",
    };
    db.insert(profiles)
      .values([
        { ...values, id: "profile-a" },
        { ...values, id: "profile-b" },
      ])
      .run();
    const day = {
      profileId: "profile-a",
      date: "2026-10-22",
      count: 3,
      baseline: 10,
      packPriceCents: 600,
      packSize: 20,
      confirmed: true,
    };
    db.insert(dailyLogs).values(day).run();
    assert.throws(() => db.insert(dailyLogs).values(day).run());
    assert.throws(() =>
      db
        .insert(dailyLogs)
        .values({ ...day, profileId: "missing" })
        .run(),
    );
    assert.equal(
      db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.profileId, "profile-b"))
        .all().length,
      0,
    );
    db.update(profiles)
      .set({ cigarettesPerDay: 20, packPriceCents: 800 })
      .where(eq(profiles.id, "profile-a"))
      .run();
    assert.equal(
      db
        .select()
        .from(dailyLogs)
        .where(
          and(
            eq(dailyLogs.profileId, "profile-a"),
            eq(dailyLogs.date, day.date),
          ),
        )
        .get()?.baseline,
      10,
    );
    const secondConnection = new Database(path, { readonly: true });
    try {
      assert.equal(
        secondConnection
          .prepare<[string], { count: number }>(
            "SELECT count FROM daily_logs WHERE profile_id = ?",
          )
          .get("profile-a")?.count,
        3,
      );
    } finally {
      secondConnection.close();
    }
  } finally {
    sqlite.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

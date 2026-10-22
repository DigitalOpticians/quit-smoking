import { sql } from "drizzle-orm";
import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

// Initial key/value storage. Add domain tables here as the app grows.
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const profiles = sqliteTable("profiles", {
  id: text("id").primaryKey(),
  cigarettesPerDay: integer("cigarettes_per_day").notNull(),
  packPriceCents: integer("pack_price_cents").notNull(),
  packSize: integer("pack_size").notNull(),
  timeZone: text("time_zone").notNull(),
  startedOn: text("started_on").notNull(),
});

export const dailyLogs = sqliteTable(
  "daily_logs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    count: integer("count").notNull().default(0),
    confirmed: integer("confirmed", { mode: "boolean" })
      .notNull()
      .default(false),
    baseline: integer("baseline").notNull(),
    packPriceCents: integer("pack_price_cents").notNull(),
    packSize: integer("pack_size").notNull(),
  },
  (table) => [
    uniqueIndex("daily_logs_profile_date").on(table.profileId, table.date),
  ],
);

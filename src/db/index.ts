import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { getDatabasePath } from "./path";
import * as schema from "./schema";

function createDatabase() {
  const sqlite = new Database(getDatabasePath());
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");
  return drizzle(sqlite, { schema });
}

const globalForDatabase = globalThis as typeof globalThis & {
  quitSmokingDb?: ReturnType<typeof createDatabase>;
};

// Open lazily and reuse the connection during development hot reloads.
export function getDb() {
  return (globalForDatabase.quitSmokingDb ??= createDatabase());
}

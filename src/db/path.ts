import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function getDatabasePath() {
  const configuredPath = process.env.DATABASE_PATH;

  if (!configuredPath?.trim()) {
    throw new Error(
      "DATABASE_PATH is required. Copy .env.example to .env.local first.",
    );
  }

  const path = resolve(process.cwd(), configuredPath);
  mkdirSync(dirname(path), { recursive: true });
  return path;
}

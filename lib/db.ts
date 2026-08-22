import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "@/drizzle/schema";

const databaseUrl = process.env.DATABASE_URL ?? "file:./data/subscriptions.db";
const filePath = databaseUrl.replace(/^file:/, "");

fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });

const sqlite = new Database(filePath);
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.resolve("drizzle/migrations") });

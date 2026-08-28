import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

process.env.DATABASE_URL = "file::memory:";
process.env.AUTH_SECRET = "test-secret";

const { runMigrations } = await import("@/lib/db");
runMigrations();

afterEach(cleanup);

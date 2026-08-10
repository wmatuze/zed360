import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

export function createDatabase(databaseUrl: string) {
  const client = postgres(databaseUrl, { prepare: false });
  return { client, db: drizzle(client, { schema }) };
}

export * from "./schema.js";
export { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";

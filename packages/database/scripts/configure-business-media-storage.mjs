import { config } from "dotenv";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../../..");
config({ path: resolve(repositoryRoot, ".env") });

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required.");
}

const policySql = await readFile(
  resolve(repositoryRoot, "scripts/configure-business-media-storage.sql"),
  "utf8",
);
const client = postgres(databaseUrl, { prepare: false, max: 1 });
try {
  await client.unsafe(policySql);
  console.log("Business media Storage policies configured successfully.");
} finally {
  await client.end({ timeout: 5 });
}

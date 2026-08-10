import { defineConfig } from "drizzle-kit";
import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const configDirectory = dirname(fileURLToPath(import.meta.url));

config({ path: resolve(configDirectory, "../../.env") });

const migrationUrl =
  process.env.DATABASE_MIGRATION_URL ??
  process.env.DATABASE_URL ??
  "postgresql://zed360:zed360@localhost:5432/zed360";

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});

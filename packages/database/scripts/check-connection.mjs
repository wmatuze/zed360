import { config } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDirectory, "../../..");

config({ path: resolve(projectRoot, ".env"), quiet: true });

const databaseUrl =
  process.env.DATABASE_MIGRATION_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_MIGRATION_URL or DATABASE_URL is required.");
}

const sql = postgres(databaseUrl, {
  connect_timeout: 15,
  max: 1,
  prepare: false,
});

try {
  const [result] = await sql`
    select
      current_database() as database_name,
      current_user as database_user,
      current_setting('server_version') as postgres_version,
      (
        select extversion
        from pg_extension
        where extname = 'postgis'
      ) as postgis_version,
      (
        select count(*)::integer
        from information_schema.tables
        where table_schema = 'public'
      ) as public_table_count
  `;

  if (!result.postgis_version) {
    throw new Error("The database is reachable, but PostGIS is not enabled.");
  }

  console.log("Database connection: successful");
  console.log(`Database: ${result.database_name}`);
  console.log(`PostgreSQL: ${result.postgres_version}`);
  console.log(`PostGIS: ${result.postgis_version}`);
  console.log(`Public tables: ${result.public_table_count}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`Database check failed: ${message}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}

import { config } from "dotenv";
import { createInterface } from "node:readline/promises";
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

const prompt = createInterface({
  input: process.stdin,
  output: process.stdout,
});
const email = (await prompt.question("Verified Zed360 account email: "))
  .trim()
  .toLowerCase();
const roleAnswer = (await prompt.question("Role (admin or reviewer) [admin]: "))
  .trim()
  .toLowerCase();
prompt.close();

const role = roleAnswer || "admin";
if (!email || !email.includes("@")) {
  throw new Error("Enter a valid account email address.");
}
if (role !== "admin" && role !== "reviewer") {
  throw new Error("Role must be admin or reviewer.");
}

const sql = postgres(databaseUrl, {
  connect_timeout: 15,
  max: 1,
  prepare: false,
});

try {
  const [user] = await sql`
    select id
    from users
    where lower(email) = ${email}
    limit 1
  `;
  if (!user) {
    throw new Error(
      "No local Zed360 user was found. Sign in and link a business first, then retry.",
    );
  }

  await sql`
    insert into user_roles (user_id, role)
    values (${user.id}, ${role})
    on conflict (user_id, role) do nothing
  `;
  console.log(`${role} access is ready for this Zed360 account.`);
} finally {
  await sql.end({ timeout: 5 });
}

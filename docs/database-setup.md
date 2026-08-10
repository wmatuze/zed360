# Managed PostgreSQL/PostGIS setup

Zed360 uses PostgreSQL with PostGIS. The recommended development setup is a managed Supabase database, so Docker is not required on the developer's computer.

Supabase is used as a PostgreSQL host. Application business logic remains in the Zed360 API, and the schema is managed with Drizzle migrations. This keeps the system portable to another compatible PostgreSQL host.

## 1. Create the development project

1. Sign in to the Supabase dashboard.
2. Create a new project inside your personal or Zed360 organisation.
3. Use `zed360-development` as the project name.
4. Generate a strong database password and save it in a password manager.
5. Select the closest currently available region to Zambia.
6. Wait for the project to finish provisioning.

Do not paste the database password, connection string, service-role key, or access token into chat, source code, screenshots, or Git.

After adding or changing the public Supabase web settings in the root `.env`,
copy only those public settings into Next.js's local environment file:

```powershell
pnpm.cmd auth:sync-env
```

The generated `apps/web/.env.local` is ignored by Git. The script never copies
database URLs, service-role keys, or other server secrets.

## 2. Enable PostGIS

In the project dashboard:

1. Open **Database**.
2. Open **Extensions**.
3. Search for `postgis`.
4. Enable the PostGIS extension.
5. Keep the dashboard's recommended schema selection.

The first Zed360 migration contains geography columns, so PostGIS must be enabled before applying it.

## 3. Get database connection strings

Use the project's **Connect** dialog.

- Prefer the direct connection for migrations when the computer/network supports IPv6.
- Otherwise select the session pooler for migrations.
- Use the session pooler for local API development when a direct connection is unavailable.
- Do not use the transaction pooler for schema migrations.

Keep `sslmode=require` in hosted connection strings. If a password is inserted manually, URL-encode reserved URL characters.

## 4. Create the private environment file

From the repository root, run the secure configuration helper:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/configure-database.ps1
```

Paste the session-pooler URI at the hidden prompt. If it contains Supabase's password placeholder, the helper asks for the database password separately and safely URL-encodes it. It then copies `.env.example` to `.env`, adds `sslmode=require` when needed, and saves the same session-pooler connection for runtime and development migrations.

If the terminal prevents pasting the URI into the hidden prompt, pass the non-secret URI containing `[YOUR-PASSWORD]` directly:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/configure-database.ps1 -ConnectionUri 'postgresql://USER:[YOUR-PASSWORD]@HOST:5432/postgres'
```

The password is still requested separately and never becomes part of the command history.

Alternatively, copy `.env.example` to `.env` manually and replace only the placeholder database values:

```dotenv
DATABASE_URL=postgresql://...
DATABASE_MIGRATION_URL=postgresql://...
```

The `.env` file is ignored by Git. Confirm that with `git status` before committing any work.

## 5. Apply and verify the schema

After PostGIS and `.env` are configured:

```powershell
pnpm.cmd db:migrate
```

Then verify in the Supabase table editor that the initial Zed360 tables exist. Never run a migration against a production project unless the target connection has been confirmed first.

## Optional Docker setup

The repository includes `compose.yaml` for developers who prefer a local PostGIS and Redis environment. It is optional and is not part of the normal setup for a resource-constrained computer.

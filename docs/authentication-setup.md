# Supabase email authentication setup

Zed360 uses Supabase Auth for passwordless business-owner sign-in. Sessions are
stored in cookies through the official Supabase SSR client and refreshed by the
Next.js request proxy.

## Security boundary

- Use only the Supabase Project URL and publishable key in the web application.
- Never put a Supabase secret key or legacy service-role key in a
  `NEXT_PUBLIC_` variable.
- Authentication proves control of an email address. It does not prove
  business ownership, PACRA registration, or permission to view customer
  requests.
- Protected operations must validate identity and authorization near the data
  source. Hiding a button or relying only on the request proxy is insufficient.

## 1. Configure the Supabase project

In the Supabase dashboard:

1. Open **Authentication → Sign In / Providers** and confirm that Email is
   enabled.
2. Open **Authentication → URL Configuration**.
3. Set the local Site URL to `http://localhost:3000` while developing.
4. Add `http://localhost:3000/auth/confirm` to the allowed Redirect URLs.

For production, replace these with the HTTPS Zed360 domain and keep localhost
only where development access is intended.

## 2. Save the public connection values

Open the Supabase **Connect** dialog and locate the Project URL and publishable
key. From the Zed360 project directory run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/configure-auth.ps1
```

Paste the two values when prompted. The script writes them to the ignored
`.env` file without printing the key.

## 3. Restart and test

Stop old development processes with `Ctrl+C`, then run one copy of:

```powershell
pnpm.cmd dev:web
```

Open `http://localhost:3000/business/sign-in`, request a link, open the email,
and confirm that the browser reaches `/business/account`.

If the web application and API ever disagree about a session, first verify
that the root `.env` and `apps/web/.env.local` contain the same public Supabase
URL and publishable key. The normal source of truth is the root `.env`, copied
to the web app with `pnpm.cmd auth:sync-env`. If the root public settings were
accidentally replaced while the working values remain in the ignored web file,
recover only those public values with:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/sync-web-environment.ps1 -RestoreRootFromWeb
```

This recovery mode preserves database URLs and other private server settings.
Restart `pnpm.cmd dev:web` after changing either environment file.

## Business account linking

After email verification, `/business/account` asks the Zed360 API for draft
businesses submitted with the same email address. Linking is always an explicit
owner action; merely signing in never claims a business.

The API independently validates the Supabase access token with Supabase Auth,
then checks the business ID, draft status, and contact email at the database
boundary. A successful link creates an owner membership and records email
contact verification. It does not change the business from `draft`, approve
ownership or PACRA registration, or reveal customer requests. A database
constraint allows only one owner account per business. Phone-only submissions
remain subject to a future manual ownership process.

The implementation order remains:

1. Business owner verifies their email and signs in.
2. The owner explicitly links an eligible submitted business.
3. Zed360 reviews and approves or rejects the business.
4. Approved businesses can view matched requests.
5. Businesses respond with availability, a price range, and a message.
6. Customers compare responses and choose whom to contact.

## Email delivery limitation

Supabase's built-in email sender is intended for exploration and may deliver
only to addresses authorised for the project. Configure custom SMTP before a
public pilot so real business owners can receive authentication messages.

## Optional PKCE email template

The confirmation route supports both an exchanged authorization code and a
token hash. If email security scanners consume default magic links, use an OTP
or a custom token-hash template following Supabase's current official guidance
rather than inventing another authentication mechanism.

## Sources checked on 10 August 2026

- Supabase Next.js SSR guide:
  <https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs>
- Supabase passwordless email guide:
  <https://supabase.com/docs/guides/auth/auth-email-passwordless>
- Supabase redirect URL guide:
  <https://supabase.com/docs/guides/auth/redirect-urls>
- Supabase authenticated-user verification reference:
  <https://supabase.com/docs/reference/javascript/auth-getuser>
- Supabase JWT guidance:
  <https://supabase.com/docs/guides/auth/jwts>
- Next.js authentication guide:
  <https://nextjs.org/docs/app/guides/authentication>

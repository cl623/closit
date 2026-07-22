# AGENTS.md

## Cursor Cloud specific instructions

### Product

`clos.it` is a single Next.js 15 (App Router) + React 19 + TypeScript app (`npm`). It is a dress-up studio where users layer fashion items on a 2D avatar, with auth, PNG uploads, and outfit-draft saving backed by Supabase. Standard scripts live in `package.json` (`dev`, `build`, `start`, `lint`); routes and the manual Supabase steps are documented in `README.md`.

### Running the app

- Dev server: `npm run dev` (http://localhost:3000). Dependencies are refreshed by the startup update script (`npm install`).
- The app degrades gracefully: without Supabase env vars the studio still loads read-only using the local seed assets in `public/seed` and `lib/seed/local-data.ts`. Login, uploads, and saving outfit drafts require Supabase.

### Full end-to-end (Supabase)

Full functionality (auth + uploads + saves) needs the local Supabase stack, which requires Docker. These are session-start steps, not part of the update script:

1. Start the Docker daemon (there is no systemd here): `sudo dockerd > /tmp/dockerd.log 2>&1 &`. Docker 29 is configured for `fuse-overlayfs` with `containerd-snapshotter` disabled in `/etc/docker/daemon.json`, and `iptables` is set to legacy — this is required for Docker-in-VM to work.
2. Start Supabase from the repo root: `sudo supabase start` (first run pulls images). Get URL/keys with `sudo supabase status`.
3. Create `.env.local` (gitignored) with the values from `supabase status`:
   - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<Publishable key>`
   Restart `npm run dev` after creating/editing `.env.local` so Next picks it up.
4. Local email auth auto-confirms signups (`enable_confirmations` is off), so a new account can sign in immediately without an email step.

### Non-obvious gotchas

- Grants: recent Supabase CLI versions no longer grant `public`-schema data privileges to the `anon`/`authenticated` API roles, but hosted Supabase (which the app's migrations target) still does. `supabase/seed.sql` restores these grants and is applied automatically on `supabase start`/`supabase db reset`. Without it, every table read fails with `permission denied` (reads silently fall back to local seed data, but saves/uploads throw).
- `supabase/config.toml` was generated with `supabase init` and is required for `supabase start`; the pre-existing SQL in `supabase/migrations/` is applied automatically on start/reset.
- PostgREST caches the schema; after ad-hoc DDL/grants run directly against the DB, issue `notify pgrst, 'reload schema';` (a full `supabase db reset` handles this automatically).
- `docker`/`supabase` CLIs run under `sudo` here.

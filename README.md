# clos.it

Gamified social mood-boarding — style 2D avatars with community fashion items.

## MVP status (Phases 1–2)

- **Dress-up studio** with base avatar + Z-index layering
- **Draft outfit save/load** (Supabase)
- **User PNG uploads** with category/color/style tags and anchor placement

Phases 3–5 (feed, leaderboards, analytics) are deferred.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a Supabase project, then run the SQL in `supabase/migrations/` (in order) in the SQL editor.

3. Copy env vars:

```bash
cp .env.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

4. Enable Email auth (password) in Supabase Auth settings.

5. Start the app:

```bash
npm run dev
```

Without Supabase env vars, the studio still loads local seed wardrobe assets from `/public/seed`. Uploads and draft saves require Supabase.

## Routes

- `/` — landing
- `/studio` — dress-up engine
- `/studio/[id]` — edit a saved draft
- `/upload` — import a transparent PNG (auth required)
- `/login` — sign in / sign up

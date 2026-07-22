# clos.it

Gamified social mood-boarding — style 2D avatars with community fashion items.

## MVP status (Phases 1–4 + studio upgrades)

- **Dress-up studio** with multi-item categories and per-piece layer order
- **Saved outfits library** (browse / edit / delete drafts)
- **Draft outfit save/load** and **publish to feed**
- **User PNG uploads** with category/color/style tags and anchor placement
- **Outfit likes** plus per-item like / save-to-closet
- **Weekly leaderboards** for top outfits and top creators
- **Reporting** for items and outfits (submit + personal report list)

Phase 5 (analytics dashboard) is deferred. Full moderation admin UI is deferred.

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

Without Supabase env vars, the studio still loads local seed wardrobe assets from `/public/seed`. Uploads, draft saves, feed, leaderboards, and reporting require Supabase.

## Routes

- `/` — landing
- `/studio` — dress-up engine (multi-layer equip)
- `/studio/[id]` — edit a saved draft (publish / unpublish)
- `/outfits` — saved outfits library
- `/feed` — chronological published outfits
- `/o/[id]` — published outfit detail (like / save / report)
- `/leaderboards` — top 10 outfits of the week + top creators
- `/reports` — reports I submitted
- `/upload` — import a transparent PNG (auth required)
- `/login` — sign in / sign up

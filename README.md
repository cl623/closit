# clos.it

Gamified social mood-boarding — style 2D avatars with community fashion items.

## MVP status (Phases 1–6)

- **Dress-up studio** with multi-item categories and per-piece layer order
- **Saved outfits library** (browse / edit / delete drafts)
- **Draft outfit save/load** and **publish to feed**
- **User PNG uploads** with category/color/style tags and anchor placement
- **Outfit likes** plus per-item like / save-to-closet
- **Weekly + monthly leaderboards** with monthly badges
- **Public profiles** (`/u/[id]`) with outfits, uploads, and badges
- **Reporting** + **admin** moderation, trend analytics (7d/30d), and account/item removal

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

5. Grant admin access (optional) after signing up:

```sql
update public.profiles set is_admin = true where id = '<your-user-uuid>';
```

6. Start the app:

```bash
npm run dev
```

Without Supabase env vars, the studio still loads local seed wardrobe assets from `/public/seed`. Uploads, draft saves, feed, leaderboards, reporting, and admin tools require Supabase.

## Routes

- `/` — landing
- `/studio` — dress-up engine (multi-layer equip)
- `/studio/[id]` — edit a saved draft (publish / unpublish)
- `/outfits` — saved outfits library
- `/feed` — chronological published outfits
- `/o/[id]` — published outfit detail (like / save / report)
- `/u/[id]` — public profile (badges, outfits, uploads)
- `/leaderboards` — weekly and monthly rankings
- `/reports` — reports I submitted (not the full moderation queue)
- `/admin` — admin only: reports review, trend analytics, top liked lists
- `/upload` — import a transparent PNG (auth required)
- `/login` — sign in / sign up

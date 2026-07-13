# SkillBridge — Export Handoff Document

This document covers everything you need to run the SkillBridge app
independently after exporting it from Bolt.

---

## 1. Environment Variables

The app references these via `import.meta.env.VITE_*` (Vite client-side)
and `process.env.*` (server-side / edge functions, if you add any later).

| Variable | Where it's used | Safe to expose? | Source |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Client-side Supabase client init | **Yes** — public by design, protected by RLS | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Client-side Supabase client init | **Yes** — the anon key is designed to be public; all data access is gated by RLS policies | Supabase Dashboard → Settings → API → Project API Keys → `anon` `public` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side / edge functions only (not currently used in client code, but needed if you deploy edge functions or run admin scripts) | **NO — secret.** Bypasses RLS entirely. Never commit, never bundle in frontend code, never expose to the browser. | Supabase Dashboard → Settings → API → Project API Keys → `service_role` |
| `VITE_GOOGLE_CLIENT_ID` | Client-side Google Sign-In button | **Yes** — it's embedded in the browser OAuth flow regardless; Google enforces security via redirect URI allow-listing | Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID |

### Google OAuth Client Secret

The Google OAuth **Client Secret** is **NOT** stored in `.env` or in client
code. It is configured at the **Supabase project level**:

> Supabase Dashboard → Authentication → Providers → Google

Bolt injected it into the Supabase Auth config when you enabled Google
Sign-In. After export, the secret stays in Supabase — you don't need to
put it in `.env`. You only need to update the **authorized redirect URIs**
in Google Cloud Console if your domain changes (see § 4 below).

---

## 2. `.env.example` File

A `.env.example` file has been created in the project root with every
variable name and empty values. After exporting:

```bash
cp .env.example .env
# Then edit .env and fill in real values
```

---

## 3. Current Architecture Summary

### Database (Supabase / PostgreSQL 17)

- **21 tables** in the `public` schema (profiles, gigs, jobs, orders,
  chats, messages, reviews, projects, bids, notifications, favorites,
  tasks, companies, job_applications, identity_verifications,
  admin_audit_log, platform_blog_posts, platform_categories,
  platform_content, platform_translations)
- **3 storage buckets**: `avatars` (public), `service-images` (public),
  `identity-documents` (private)
- **RLS enabled** on every table with per-user ownership policies
- **2 trigger functions**: `handle_new_user()` (creates profile on
  signup), `generate_public_id()` (assigns 8-char public ID before
  insert)
- **8 migrations** applied (001–008)
- **PostgreSQL extensions**: pgcrypto, uuid-ossp, supabase_vault,
  pg_stat_statements

### Authentication

- Email/password registration via Supabase Auth
- Google OAuth via Supabase Auth (provider configured at project level)
- Auth trigger `on_auth_user_created` fires `handle_new_user()` which
  inserts a row into `public.profiles` with defaults
- `profiles.id` is a foreign key to `auth.users.id` (ON DELETE CASCADE)

### No Edge Functions or AI Integrations

- No edge functions are currently deployed
- No AI/Gemini API keys are configured or needed
- No third-party API keys beyond Supabase and Google OAuth

---

## 4. Bolt-Specific Features That Need Manual Setup After Export

### 4a. Google OAuth Redirect URI

The Google OAuth redirect URI is currently set to the Bolt/Supabase
project URL. After you deploy to a new domain, you must update it.

**In Google Cloud Console:**
1. Go to APIs & Services → Credentials
2. Edit your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add your new domain
   (e.g. `https://yourdomain.com`)
4. Under **Authorized redirect URIs**, the Supabase callback URL must
   be:
   ```
   https://xxxxxxxxxxxxxxxx.supabase.co/auth/v1/callback
   ```
   This is your **Supabase project URL** (not your app domain) + the
   path `/auth/v1/callback`. This value does NOT change when you move
   hosting — it's tied to the Supabase project, not the frontend domain.

**In Supabase Dashboard:**
1. Go to Authentication → URL Configuration
2. Update **Site URL** to your new domain (e.g.
   `https://yourdomain.com`)
3. Update **Redirect URLs** to include your new domain's callback
   paths if you use client-side routing for auth redirects

### 4b. Supabase Project URL & Keys

The Supabase project itself does **not** move when you export from
Bolt. Your database, auth, and storage stay at the same Supabase URL.
You just need to copy the URL and keys into your new `.env` file.

If you want to use a **different** Supabase project after export:
1. Create a new Supabase project
2. Run all 8 migrations (found in `supabase/migrations/` if exported,
   or re-apply via the SQL in each migration file)
3. Enable Google OAuth in the new project's Auth settings
4. Update the Google Cloud Console redirect URI to the new Supabase
   project URL
5. Update `.env` with the new project's URL and keys

### 4c. Hosting / Custom Domain

Bolt's built-in hosting (`.bolt.host` domain) will not carry over.
After export, you need to deploy the built static files to a hosting
provider of your choice (Netlify, Vercel, Cloudflare Pages, any static
host, or your own server). The app is a Vite SPA — build with
`npm run build` and serve the `dist/` folder.

### 4d. Storage Bucket Public URLs

Avatar and service image URLs are stored as public Supabase storage
URLs in the database. These URLs reference your Supabase project's
storage domain, which does not change on export. If you migrate to a
new Supabase project, you'd need to migrate stored files and update
URLs.

---

## 5. Post-Export Setup Checklist

### Step 1 — Install dependencies

```bash
npm install
```

### Step 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:
- `VITE_SUPABASE_URL` — from Supabase Dashboard → Settings → API
- `VITE_SUPABASE_ANON_KEY` — from same page
- `SUPABASE_SERVICE_ROLE_KEY` — from same page (only if you plan to
  run server-side code)
- `VITE_GOOGLE_CLIENT_ID` — from Google Cloud Console → Credentials

### Step 3 — Start the dev server

```bash
npm run dev
```

### Step 4 — Verify end-to-end

1. **Registration**: Open the site, click Sign Up, register with a
   new email/password. Confirm no "Database error saving new user"
   message. Check that a profile row was created (Supabase Dashboard →
   Table Editor → profiles).

2. **Login**: Log out, then log back in with the same email/password.
   Confirm you're redirected to the dashboard/home page.

3. **Google Sign-In**: Click "Sign in with Google". Confirm the Google
   popup appears, complete the flow, and you're redirected to the
   dashboard. Verify a profile row was created for the Google user.

4. **Avatar upload**: Go to profile/settings, upload an avatar image.
   Confirm it appears in the `avatars` bucket (Supabase Dashboard →
   Storage) and displays on your profile.

5. **Admin panel**: Log in as the admin user
   (`manuchersobirov2006@gmail.com`), navigate to `/admin`. Confirm the
   admin dashboard loads with user management, content management, and
   audit log panels.

### Step 5 — Build for production

```bash
npm run build
```

Upload the contents of the `dist/` folder to your hosting provider.

### Step 6 — Update Google OAuth for production domain

Once you have your production domain:
1. Add the domain to Google Cloud Console → Credentials → Authorized
   JavaScript origins
2. Update Supabase Dashboard → Authentication → URL Configuration →
   Site URL to your production domain

---

## 6. Migration Files Reference

All 8 migrations applied to this Supabase project:

| # | File | Purpose |
|---|---|---|
| 001 | `001_skillbridge_schema.sql` | Core schema: profiles, gigs, jobs, orders, chats, messages, reviews, projects, bids, notifications, favorites, tasks, companies + RLS |
| 002 | `002_seed_demo_data.sql` | Demo users, gigs, jobs, categories, content |
| 003 | `003_storage_identity_verifications.sql` | Storage buckets, identity_verifications table, storage RLS policies |
| 004 | `004_admin_panel_infrastructure.sql` | Admin audit log, platform content tables, is_admin/is_suspended columns |
| 005 | `005_service_images_public_id.sql` | service-images bucket, public_id column on profiles, generate_public_id trigger |
| 006 | `006_job_applications.sql` | job_applications table + RLS |
| 007 | `007_security_hardening.sql` | Fixed search_path, dropped broad SELECT policies, revoked EXECUTE on SECURITY DEFINER functions |
| 008 | `008_fix_registration_trigger.sql` | Fixed gen_random_bytes search_path issue that broke registration |

If migrating to a new Supabase project, apply these in order.

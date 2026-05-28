# Dental Sales CRM — Build Plan

A professional single-user B2B CRM for dental clinic outreach, with relational data, exports, and bidirectional Google Sheets sync.

## 1. Backend (Lovable Cloud / Supabase)

**Enable Lovable Cloud**, then create schema via migration:

- `clinic_status` enum: `New | Researching | Contacted | In Discussion | Closed-Won`
- `social_platform` enum: `Instagram | Facebook | Twitter | YouTube | LinkedIn`
- `clinics` — all fields per spec, `user_id` FK to `auth.users`, timestamps
- `staff` — FK `clinic_id`, full_name, role, email, linkedin_url, facebook_url, instagram_url, notes
- `socials` — FK `clinic_id`, nullable `staff_id`, platform enum, url
- `outreach_timeline` — FK `clinic_id`, nullable `staff_id`, type, notes, outcome, date_logged

Each table: GRANTs to `authenticated` + `service_role`, RLS enabled, policies scoped to `auth.uid() = clinics.user_id` (joined for child tables). Indexes on FKs and `status`.

**Auth**: email/password only. Public signups disabled (handled by seeding the single user `SaadNehu07` with password `Jlmbwp07` and not exposing a signup page in the UI — login page only).

**Edge Function `handle-sheet-sync`**:
- POST endpoint accepting JSON array of rows (headers from spec)
- Maps incoming headers → clinic fields; upserts clinic by `(user_id, clinic_name)` unique key
- Splits social URLs (`business_facebook`, `business_Instagram`, ...) into `socials` rows linked to the clinic
- Extracts `Dentist` + `Staff_name1/role1/facebook1/linkedin1` into `staff` rows (and their socials)
- Returns `{ inserted, updated, errors }`
- Uses service-role key, CORS enabled, secret token guard (`SHEET_SYNC_TOKEN`)

## 2. Frontend Structure

Routes:
- `/auth` — login only
- `/` — Dashboard (KPIs + recent activity)
- `/clinics` — Directory (search, status filter, sync indicators)
- `/clinics/:id` — Detail (split: info left, tabs Staff / Outreach right)
- `/settings` — Sheet sync config (shows webhook URL + token, copy buttons, instructions)

Shared: `AppLayout` with sidebar nav, theme toggle (dark/light via `next-themes`), toast notifications (`sonner`), shadcn skeletons during loads.

## 3. Key Features

- **Dashboard KPIs**: total clinics, by status, total staff, outreach this week. Recent activity = last 10 outreach entries.
- **Download Data** button: aggregates all clinics + staff + outreach via Supabase queries and generates a multi-sheet XLSX (`xlsx` lib) — sheets: Clinics, Staff, Outreach, Socials.
- **Directory**: table with search (clinic_name/city/email), status filter, last-synced indicator badge.
- **Detail View**: editable clinic fields, Staff tab (add/edit/delete + socials), Outreach tab (timeline list + add log). "Export Full Clinic History" → single XLSX for that clinic.
- **Settings**: shows Edge Function URL `https://<project>.supabase.co/functions/v1/handle-sheet-sync` + sync token + sample Apps Script snippet for Google Sheets.

## 4. Design System

Modern SaaS look: neutral slate base, indigo primary accent. Semantic tokens in `index.css`; light/dark variants. Inter font. Subtle borders, rounded-lg, soft shadows. All colors via HSL tokens — no direct text-white/bg-black.

## Technical Details

- Libraries: `xlsx` for exports, `@tanstack/react-query` for data fetching/caching, `date-fns` for timestamps, `sonner` for toasts.
- Forms: react-hook-form + zod (already in stack).
- Edge function uses `npm:@supabase/supabase-js@2` and `npm:zod` for validation.
- User seeding: SQL migration inserts user via `auth.users` with crypted password using `crypt('Jlmbwp07', gen_salt('bf'))`.

After approval I'll enable Cloud, run the migration, build the UI, and deploy the edge function.

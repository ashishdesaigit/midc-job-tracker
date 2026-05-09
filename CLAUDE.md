# JobTrack — MIDC Job Tracking PWA

## What this is
A mobile-first PWA for small Indian manufacturing units (foundries, machine shops) in the Kolhapur MIDC belt. Digitises job tracking from order receipt to delivery, with subcontractor management as a core feature.

**Deployed:** https://midc-job-tracker.vercel.app  
**Repo:** https://github.com/ashishdesaigit/midc-job-tracker  
**Admin login:** phone `9730350766` + password (phone-based auth, stored as `9730350766@jobtrack.app`)  
**Dev login:** `test@jobtrack.dev` / `TestOwner1!` — on the login page there is a dev bypass button

## Tech stack
- React 19 + Vite 8 + TailwindCSS v4
- React Router v7 (v6 API)
- Zustand v5 (persisted auth store)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- vite-plugin-pwa + Workbox
- @dnd-kit for drag-to-reorder
- Vercel hosting

## Auth
- Phone + password login: phone `9876543210` stored as `9876543210@jobtrack.app` in Supabase Auth
- Admin identified by `user.role === 'admin'` in Zustand store (NOT by email)
- `ProtectedRoute`, `SetupRoute`, `AdminRoute` in `src/routes/ProtectedRoute.jsx`
- New unit owners onboarded via `/admin` → `provision-unit` Edge Function
- Team members added via `create-user` Edge Function
- Both Edge Functions deployed to Supabase project `toksqsqnbdfxypglpqgj`

## Roles
- `owner` → `/dashboard` (read-only for jobs, full access to settings/vendors/customers)
- `supervisor` → `/jobs` (primary data entry)
- `accounts` → `/dispatch`
- `admin` → `/admin` (platform management, your phone only)

## Key DB tables
Standard: `units`, `users`, `stage_templates`, `customers`, `vendors`, `jobs`, `job_stage_log`, `job_stage_log` (has `closing_remark`, `photo_url` columns added), `subcontracts`, `dispatches`

Custom additions (run migrations if fresh DB):
- `job_comments` — stage-aware comments with photos on job detail
- `job_stages` — per-job custom stage sequences; `jobs.current_job_stage_id` FK
- `vendor_payments` — payment ledger per vendor (not per-job)
- `team_invites` — email-based team invites (owner role allowed)
- `subcontracts.stage_name` — which stage a subcontract belongs to (critical for multi-vendor-stage jobs)

SQL migration files in `src/db/`:
- `schema.sql` — base schema (run first on fresh DB)
- `setup_function.sql` — `setup_unit()` RPC
- `phase5_migrations.sql` — `team_invites`, admin RPCs
- `admin_create_unit.sql` — `admin_create_unit()` RPC (deprecated, use Edge Function now)
- `job_stages.sql` — `job_stages` table + `jobs.current_job_stage_id`
- `vendor_payments.sql` — `vendor_payments` table
- `subcontract_stage.sql` — `subcontracts.stage_name` column ← run this if vendor flow is broken

## Stage system (important — dual-mode)
Jobs can use unit-level `stage_templates` OR job-specific `job_stages`:
- If `job.current_job_stage_id` is set → job uses `job_stages` (custom)
- Otherwise → uses `stage_templates` (unit default)
- `isCustomStages = !!job.current_job_stage_id` computed in JobDetail
- All stage movement (forward/back) must update the correct field

**Dispatch stage is always the last, locked stage** — in Setup.jsx and Settings.jsx:
- `editStages` = all stages except last
- `lastStage` = Dispatch, stored separately, never in editable list

## Vendor/subcontract flow
1. Job advances to a vendor stage via "Next stage →" (normal stage movement)
2. At vendor stage, "Outsource to vendor?" section appears (collapsible)
3. User optionally taps "Send to vendor" → `/jobs/:id/subcontract`
4. `JobSubcontract.jsx` creates subcontract with `stage_name = currentStage.name`
5. Job stays at vendor stage — no auto-advance
6. User marks returned → subcontract status updated, job stays at vendor stage
7. "Next stage →" button unlocks (was blocked while `activeSub` pending)
8. User manually advances
9. Each stage only sees its own subcontracts (filtered by `stage_name`)

## Key component files
- `src/components/Layout.jsx` — bottom nav (role-aware) + profile/sign-out sheet
- `src/components/ui/MarkReturned.jsx` — vendor return bottom sheet (NO auto-advance)
- `src/components/ui/BottomSheet.jsx`, `StagePill.jsx`, `Skeleton.jsx`, `EmptyState.jsx`
- `src/lib/numbering.js` — `nextJobNumber`, `nextChallanRef`, `nextDcNumber`
- `src/lib/demoSeed.js` — loads demo data (3 customers, 3 vendors, 6 jobs)
- `src/lib/photoUpload.js` — compresses + uploads to `job-photos` bucket

## Landing page
`/info` — public route, no auth, `src/pages/Info.jsx`
Screenshots go in `public/screenshots/`: `dashboard.png`, `job-list.png`, `outside-jobs.png`, `job-detail.png`

## Patterns to follow
- All Marathi removed — UI is in English
- No `capture="environment"` on file inputs (was causing Android gallery issues)
- `supabase` imported from `src/lib/supabase.js`
- RLS handles unit isolation — no need to manually filter by `unit_id` in most queries
- `job_stage_log.stage_id` is null for custom-stage jobs (only `stage_name` is reliable)
- Comments in activity log are grouped by `stage_name` and collapsible per stage
- Activity shows last 2 items by default, "Show all" expands

## Outstanding items
- Icons `public/icon-192.png` and `public/icon-512.png` needed for PWA
- Remove dev login button in `Login.jsx` before first real client goes live
- Phone OTP (replace email/password) — Twilio or MSG91 needed; code is ready to swap back
- Dashboard vendor payables still uses old subcontract `payment_status` — should migrate to `vendor_payments` table
- `/info` screenshots not yet added

# JobTrack — MIDC Job Tracking PWA

## What this is
A mobile-first PWA for small Indian manufacturing units (foundries, machine shops) in the Kolhapur MIDC belt. Digitises job tracking from order receipt to delivery, with subcontractor management as a core feature.

**Deployed:** https://midc-job-tracker.vercel.app  
**Repo:** https://github.com/ashishdesaigit/midc-job-tracker  
**Admin login:** phone `9730350766` + password (stored as `9730350766@jobtrack.app`)  
**Dev login:** `test@jobtrack.dev` / `TestOwner1!` — dev bypass button on login page

## Tech stack
- React 19 + Vite 8 + TailwindCSS v4
- React Router v7 (v6 API)
- Zustand v5 (persisted auth store)
- Supabase (PostgreSQL + Auth + Storage + Realtime)
- vite-plugin-pwa + Workbox
- @dnd-kit for drag-to-reorder
- Vercel hosting

## Auth
- **Phone + password login**: phone stored as `{phone}@jobtrack.app` in Supabase Auth
- Admin identified by `user.role === 'admin'` in Zustand store
- `ProtectedRoute`, `SetupRoute`, `AdminRoute` in `src/routes/ProtectedRoute.jsx`
- New units provisioned via `/admin` → `provision-unit` Edge Function (creates auth user + unit + stages)
- Team members added via `create-user` Edge Function
- Both Edge Functions in `supabase/functions/` — deployed to project `toksqsqnbdfxypglpqgj`

## Roles
- `owner` → `/dashboard` — Home, Jobs, Outside, Vendors, Customers, Insights, Settings in nav
- `supervisor` → `/jobs` — Jobs, Outside, Vendors, Customers in nav
- `accounts` → `/dispatch` — Dispatch, Jobs in nav
- `admin` → `/admin` (platform management, your phone only)

## Key DB tables
Standard: `units`, `users`, `stage_templates`, `customers`, `vendors`, `jobs`, `job_stage_log` (has `closing_remark` column), `subcontracts`, `dispatches`

Custom additions (run migrations if fresh DB):
- `job_comments` — stage-aware comments with photos on job detail
- `job_stages` — per-job custom stage sequences; `jobs.current_job_stage_id` FK
- `vendor_payments` — actual payment ledger per vendor (NOT per-job)
- `team_invites` — invite-based team onboarding
- `subcontracts.stage_name` — which stage a subcontract belongs to (critical)

SQL migration files in `src/db/`:
- `schema.sql` — base schema (run first on fresh DB)
- `setup_function.sql` — `setup_unit()` RPC + alters `users.phone` to nullable
- `phase5_migrations.sql` — `team_invites`, admin RPCs (`admin_get_units` etc.)
- `job_stages.sql` — `job_stages` table + `jobs.current_job_stage_id`
- `vendor_payments.sql` — `vendor_payments` table
- `subcontract_stage.sql` — `subcontracts.stage_name` column ← run this if vendor flow broken
- `admin_create_unit.sql` — deprecated, use `provision-unit` Edge Function instead

Test data scripts:
- `test_insights_data.sql` / `delete_test_insights_data.sql` — machine shop demo data (J-101+)
- `desai_industries_seed.sql` / `desai_industries_delete.sql` — foundry demo data (J-201+)

## Stage system (important — dual-mode)
Jobs can use unit-level `stage_templates` OR job-specific `job_stages`:
- If `job.current_job_stage_id` is set → uses `job_stages` (custom per-job)
- Otherwise → uses `stage_templates` (unit default)
- `isCustomStages = !!job.current_job_stage_id` computed in JobDetail
- All stage movement (forward/back/subcontract queries) must use the correct field
- `job_stage_log.stage_id` is null for custom-stage jobs — only `stage_name` is reliable

**Dispatch stage is always the last, locked stage** — in Setup.jsx and Settings.jsx:
- `editStages` = all stages except last (stored separately as `lastStage`)
- Never include Dispatch in the DnD list — this was a previous bug, keep them separate

**Stage movement UI in JobDetail:**
- Forward: "Next stage →" button → confirmation sheet (no closing remark captured)
- Backward: "← Back to [stage]" button → confirmation sheet
- Both buttons appear AFTER the comment/photo section
- Activity log: current stage comments always visible; previous stages collapsed under "Previous Stage Details"

## Vendor/subcontract flow
1. Job manually advances to a vendor stage (user clicks "Next stage →")
2. At vendor stage, collapsible "Outsource to vendor for [stage]?" section appears
3. User optionally sends to vendor → `/jobs/:id/subcontract`
4. `JobSubcontract.jsx` creates subcontract with `stage_name = currentStage.name` — NO stage movement
5. While pending: "Next stage →" blocked
6. User marks returned (MarkReturned — NO auto-advance): notes + photo, job stays at stage
7. After return: subcontract card shows "Returned ✓", "Next stage →" unlocks
8. User manually advances to next stage
9. Each stage filters subcontracts by `stage_name` — no bleed across stages

## Insights screen (`/insights` — owner only)
- `src/hooks/useInsightsData.js` — all data fetching and calculation
- `src/pages/Insights.jsx` — UI with month selector (back 3 months)
- 5 sections: Cycle Time, Stage-wise Time (CSS bars), Vendor Reliability, Delivery Performance, Subcontract Spend
- Empty state when < 5 completed jobs; skeleton loaders per section
- No external chart library — pure CSS bars only

## Job Completion Report (PDF)
- `src/lib/generateJobReport.js` — generates print-ready HTML document
- "Download Report" button on dispatched jobs in JobDetail header
- Opens in new tab → user prints to PDF or paper
- Sections: timeline, job details, stage breakdown with bars, vendor table, rejections, activity log

## Landing page (`/info`)
- Public route, no auth, `src/pages/Info.jsx`
- Sections: Hero + problems, How it works (2 roles), Screenshots (horizontal swiper with arrows), Features, CTA + contact
- OG tags set via `useEffect` + hardcoded in `index.html` for WhatsApp sharing
- Screenshots in `public/screenshots/`: `dashboard.png`, `job-list.png`, `outside-jobs.png`, `job-detail.png`, `insight.png`, `comments.png`, `vendor-followup.png`

## WhatsApp integration
- `src/lib/whatsapp.js` — `openWhatsApp(phone, message)`
- On mobile: uses `whatsapp://send` URI scheme (opens app directly)
- On desktop: falls back to `wa.me` URL
- Used in: Outside screen (vendor follow-up), JobSubcontract (challan share), JobDispatch (DC share)

## Key component files
- `src/components/Layout.jsx` — bottom nav (role-aware, 6 tabs for owner) + profile/sign-out sheet
- `src/components/ui/MarkReturned.jsx` — vendor return: notes + photo + date only (no qty fields)
- `src/components/ui/BottomSheet.jsx`, `StagePill.jsx`, `Skeleton.jsx`, `EmptyState.jsx`
- `src/lib/numbering.js` — `nextJobNumber`, `nextChallanRef`, `nextDcNumber`
- `src/lib/generateJobReport.js` — PDF report HTML generator
- `src/lib/demoSeed.js` — demo data loader (used from Settings page)
- `src/lib/photoUpload.js` — compresses + uploads to `job-photos` bucket

## Patterns to follow
- All UI in English (no Marathi)
- No `capture="environment"` on file inputs (Android gallery issue)
- Use `<label>` wrapping file inputs (not programmatic `.click()`) for Android compatibility
- `supabase` imported from `src/lib/supabase.js`
- RLS handles unit isolation — no manual `unit_id` filter needed in most queries
- Stage pills in Jobs list and CustomerDetail use dual-mode: `job.current_job_stage ?? job.stage_templates`
- `vendor_payments` table tracks actual payments; `subcontracts.payment_status` deprecated for display
- Settings stage editor: `editStages` + `lastStage` stored separately — never merge into one array

## PWA / Mobile
- Icons: `public/icon-192.png` + `public/icon-512.png` (blue "J" on rounded square)
- `public/apple-touch-icon.png` linked in `index.html`
- Android standalone mode requires valid icons — without them opens in browser
- `vercel.json` rewrites all paths to `index.html` for SPA routing

## Outstanding before first real client
- Remove dev login button in `Login.jsx`
- Dashboard vendor payables section still uses old `subcontract.payment_status` — should use `vendor_payments` table
- Phone OTP option: code architecture supports it, needs Twilio/MSG91 configured

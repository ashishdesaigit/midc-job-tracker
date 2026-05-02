-- JobTrack — Supabase schema
-- Run this in the Supabase SQL editor for your project.

create extension if not exists "uuid-ossp";

-- Units (one per foundry/machine shop client)
create table units (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text check (type in ('foundry','machine_shop','combined')),
  owner_name text,
  phone text,
  address text,
  gstin text,
  is_active boolean default true,
  plan text check (plan in ('trial','paid')) default 'trial',
  trial_ends_at timestamptz default (now() + interval '90 days'),
  created_at timestamptz default now()
);

-- Users (whitelist — no self registration)
create table users (
  id uuid primary key references auth.users,
  unit_id uuid references units(id),
  name text not null,
  role text check (role in ('owner','supervisor','accounts')),
  phone text not null unique,
  is_active boolean default true,
  added_by uuid references users(id),
  created_at timestamptz default now()
);

-- Stage templates (configurable per unit)
create table stage_templates (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  name text not null,
  order_index integer not null,
  is_subcontract boolean default false,
  created_at timestamptz default now()
);

-- Customers
create table customers (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  name text not null,
  phone text,
  gstin text,
  credit_days integer default 30,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Vendors
create table vendors (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  name text not null,
  phone text not null,
  work_types text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Jobs (core entity)
create table jobs (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references units(id),
  job_number text not null,
  customer_id uuid references customers(id),
  part_name text not null,
  material text,
  qty_ordered integer not null,
  qty_balance integer,
  rate numeric(10,2),
  rate_unit text check (rate_unit in ('piece','kg')) default 'piece',
  free_issue boolean default false,
  free_issue_qty integer,
  due_date date,
  current_stage_id uuid references stage_templates(id),
  status text check (status in ('active','dispatched','cancelled')) default 'active',
  photo_url text,
  remarks text,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- Stage movement log
create table job_stage_log (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  stage_id uuid references stage_templates(id),
  stage_name text not null,
  moved_by uuid references users(id),
  moved_at timestamptz default now(),
  notes text
);

-- Subcontracts
create table subcontracts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  vendor_id uuid references vendors(id),
  challan_ref text not null,
  qty_sent integer not null,
  operation_desc text,
  rate_per_piece numeric(10,2),
  sent_date date not null,
  expected_return date,
  qty_received integer,
  qty_rejected integer default 0,
  rejection_note text,
  rejection_photo_url text,
  actual_return_date date,
  status text check (status in ('pending','returned','partial')) default 'pending',
  payment_status text check (payment_status in ('pending','paid')) default 'pending',
  paid_at timestamptz,
  created_at timestamptz default now()
);

-- Dispatches
create table dispatches (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  dc_number text not null,
  qty_dispatched integer not null,
  dispatch_date date not null,
  vehicle_info text,
  photo_url text,
  remarks text,
  payment_status text check (payment_status in ('pending','paid')) default 'pending',
  paid_at timestamptz,
  created_by uuid references users(id),
  created_at timestamptz default now()
);

-- ─── Row Level Security ────────────────────────────────────────────────────────

alter table units enable row level security;
alter table users enable row level security;
alter table stage_templates enable row level security;
alter table customers enable row level security;
alter table vendors enable row level security;
alter table jobs enable row level security;
alter table job_stage_log enable row level security;
alter table subcontracts enable row level security;
alter table dispatches enable row level security;

-- Helper: current user's unit_id
create or replace function get_unit_id()
returns uuid as $$
  select unit_id from users where id = auth.uid()
$$ language sql security definer;

-- Helper: is current user an owner
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from users
    where id = auth.uid()
    and role = 'owner'
  )
$$ language sql security definer;

create policy "unit_isolation" on units
  for all using (id = get_unit_id());

create policy "unit_isolation" on users
  for all using (unit_id = get_unit_id());

create policy "unit_isolation" on stage_templates
  for all using (unit_id = get_unit_id());

create policy "unit_isolation" on customers
  for all using (unit_id = get_unit_id());

create policy "unit_isolation" on vendors
  for all using (unit_id = get_unit_id());

create policy "unit_isolation" on jobs
  for all using (unit_id = get_unit_id());

create policy "unit_isolation" on job_stage_log
  for all using (
    job_id in (select id from jobs where unit_id = get_unit_id())
  );

create policy "unit_isolation" on subcontracts
  for all using (
    job_id in (select id from jobs where unit_id = get_unit_id())
  );

create policy "unit_isolation" on dispatches
  for all using (
    job_id in (select id from jobs where unit_id = get_unit_id())
  );

-- ─── Storage bucket ────────────────────────────────────────────────────────────
-- Create in Supabase dashboard: Storage > New bucket > "job-photos" (public)
-- Path convention:
--   {unit_id}/{job_id}/sample_{timestamp}.jpg
--   {unit_id}/{job_id}/dispatch_{timestamp}.jpg
--   {unit_id}/{job_id}/rejection_{subcontract_id}.jpg

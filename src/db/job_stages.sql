-- Per-job stage sequences
-- Run in Supabase SQL Editor

create table public.job_stages (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid references jobs(id) on delete cascade,
  name         text not null,
  order_index  integer not null,
  is_subcontract boolean default false,
  created_at   timestamptz default now()
);

alter table public.job_stages enable row level security;

create policy "unit_isolation" on public.job_stages
  for all using (
    job_id in (select id from jobs where unit_id = get_unit_id())
  );

-- Jobs table: add pointer to current job-specific stage
alter table public.jobs
  add column if not exists current_job_stage_id uuid references job_stages(id);

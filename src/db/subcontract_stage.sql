-- Each subcontract now knows which stage it belongs to
-- Run in Supabase SQL Editor

alter table public.subcontracts
  add column if not exists stage_name text;

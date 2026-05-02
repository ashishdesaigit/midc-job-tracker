-- Vendor payment ledger — tracks actual payments made to vendors
-- Run in Supabase SQL Editor

create table public.vendor_payments (
  id        uuid primary key default gen_random_uuid(),
  vendor_id uuid references vendors(id) on delete cascade,
  unit_id   uuid references units(id),
  amount    numeric(10,2) not null check (amount > 0),
  note      text,
  paid_by   uuid references users(id),
  paid_at   timestamptz default now()
);

alter table public.vendor_payments enable row level security;

create policy "unit_isolation" on public.vendor_payments
  for all using (unit_id = get_unit_id());

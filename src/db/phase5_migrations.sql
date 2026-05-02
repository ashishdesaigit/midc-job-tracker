-- ── Run this in Supabase SQL Editor ─────────────────────────────────────────

-- 1. Team invites (for owner to invite supervisors/accounts users)
create table if not exists public.team_invites (
  id        uuid primary key default gen_random_uuid(),
  unit_id   uuid references units(id) on delete cascade,
  email     text not null,
  name      text not null,
  role      text check (role in ('supervisor','accounts')) not null,
  created_at timestamptz default now()
);
alter table public.team_invites enable row level security;
create policy "unit_isolation" on public.team_invites
  for all using (unit_id = get_unit_id());

-- 2. Redeem invite on first login (SECURITY DEFINER bypasses RLS)
create or replace function public.redeem_team_invite(p_email text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite  team_invites%rowtype;
  v_unit    units%rowtype;
  v_user    users%rowtype;
begin
  select * into v_invite from team_invites where email = p_email limit 1;
  if not found then return null; end if;

  if exists (select 1 from users where id = auth.uid()) then
    return null;
  end if;

  select * into v_unit from units where id = v_invite.unit_id;

  insert into users (id, unit_id, name, role, is_active)
  values (auth.uid(), v_invite.unit_id, v_invite.name, v_invite.role, true)
  returning * into v_user;

  delete from team_invites where id = v_invite.id;

  return json_build_object(
    'user', row_to_json(v_user),
    'unit', row_to_json(v_unit)
  );
end;
$$;

-- 3. Admin RPC functions (security definer — frontend AdminRoute gates access)
create or replace function public.admin_get_units()
returns json
language sql
security definer
set search_path = public
as $$
  select json_agg(row_to_json(t) order by t.created_at desc)
  from (
    select u.*,
      (select count(*) from users where unit_id = u.id) as user_count
    from units u
  ) t;
$$;

create or replace function public.admin_set_unit_active(p_unit_id uuid, p_active boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update units set is_active = p_active where id = p_unit_id;
$$;

create or replace function public.admin_set_unit_plan(p_unit_id uuid, p_plan text)
returns void
language sql
security definer
set search_path = public
as $$
  update units set plan = p_plan where id = p_unit_id;
$$;

create or replace function public.admin_get_unit_users(p_unit_id uuid)
returns json
language sql
security definer
set search_path = public
as $$
  select json_agg(row_to_json(u) order by u.created_at)
  from users u
  where unit_id = p_unit_id;
$$;

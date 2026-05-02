-- Run in Supabase SQL Editor

-- Allow 'owner' role in team_invites (needed for admin-created unit owners)
alter table public.team_invites
  drop constraint if exists team_invites_role_check;
alter table public.team_invites
  add constraint team_invites_role_check
  check (role in ('owner', 'supervisor', 'accounts'));

-- Admin: create a unit with default stages + owner invite in one call
create or replace function public.admin_create_unit(
  p_name       text,
  p_type       text,
  p_owner_name  text,
  p_owner_email text,
  p_address    text default null,
  p_gstin      text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
begin
  insert into units (name, type, owner_name, address, gstin)
  values (p_name, p_type, p_owner_name, p_address, p_gstin)
  returning id into v_unit_id;

  -- Default stages by unit type
  if p_type = 'foundry' then
    insert into stage_templates (unit_id, name, order_index, is_subcontract) values
      (v_unit_id, 'Pattern Check', 0, false),
      (v_unit_id, 'Moulding',      1, false),
      (v_unit_id, 'Pouring',       2, false),
      (v_unit_id, 'Shakeout',      3, false),
      (v_unit_id, 'Fettling',      4, true),
      (v_unit_id, 'Inspection',    5, false),
      (v_unit_id, 'Dispatch',      6, false);
  elsif p_type = 'machine_shop' then
    insert into stage_templates (unit_id, name, order_index, is_subcontract) values
      (v_unit_id, 'Material Received', 0, false),
      (v_unit_id, 'Setup',             1, false),
      (v_unit_id, 'Turning',           2, false),
      (v_unit_id, 'Milling',           3, false),
      (v_unit_id, 'Drilling',          4, false),
      (v_unit_id, 'Inspection',        5, false),
      (v_unit_id, 'Dispatch',          6, false);
  else
    insert into stage_templates (unit_id, name, order_index, is_subcontract) values
      (v_unit_id, 'Pattern Check', 0, false),
      (v_unit_id, 'Moulding',      1, false),
      (v_unit_id, 'Pouring',       2, false),
      (v_unit_id, 'Fettling',      3, false),
      (v_unit_id, 'Turning',       4, false),
      (v_unit_id, 'Milling',       5, false),
      (v_unit_id, 'Inspection',    6, false),
      (v_unit_id, 'Dispatch',      7, false);
  end if;

  -- Owner invite — redeemed on first login
  insert into team_invites (unit_id, email, name, role)
  values (v_unit_id, lower(trim(p_owner_email)), p_owner_name, 'owner');

  return v_unit_id;
end;
$$;

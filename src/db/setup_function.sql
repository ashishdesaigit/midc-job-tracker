-- Run this in Supabase SQL Editor (after schema.sql).

-- Make phone nullable — email-auth users may not have a phone yet
alter table public.users alter column phone drop not null;

-- Atomic first-time setup — runs as SECURITY DEFINER to bypass RLS
-- Called from the /setup page after the owner's first login.
create or replace function public.setup_unit(
  p_unit_name     text,
  p_unit_type     text,
  p_owner_name    text,
  p_owner_phone   text    default null,
  p_address       text    default null,
  p_gstin         text    default null,
  p_stages        jsonb   default '[]'::jsonb,
  p_customer_name  text   default null,
  p_customer_phone text   default null,
  p_customer_gstin text   default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_unit_id uuid;
begin
  -- Prevent duplicate setup
  if exists (select 1 from users where id = auth.uid()) then
    raise exception 'already_setup';
  end if;

  -- Create unit
  insert into units (name, type, owner_name, phone, address, gstin)
  values (p_unit_name, p_unit_type, p_owner_name, p_owner_phone, p_address, p_gstin)
  returning id into v_unit_id;

  -- Create owner user record
  insert into users (id, unit_id, name, role, phone, is_active)
  values (auth.uid(), v_unit_id, p_owner_name, 'owner', p_owner_phone, true);

  -- Insert stage templates preserving order
  insert into stage_templates (unit_id, name, order_index, is_subcontract)
  select
    v_unit_id,
    elem->>'name',
    (row_number() over ())::int - 1,
    coalesce((elem->>'is_subcontract')::boolean, false)
  from jsonb_array_elements(p_stages) as s(elem)
  where trim(elem->>'name') <> '';

  -- Optional first customer
  if p_customer_name is not null and trim(p_customer_name) <> '' then
    insert into customers (unit_id, name, phone, gstin)
    values (
      v_unit_id,
      trim(p_customer_name),
      nullif(trim(coalesce(p_customer_phone, '')), ''),
      nullif(trim(coalesce(p_customer_gstin, '')), '')
    );
  end if;

  return v_unit_id;
end;
$$;

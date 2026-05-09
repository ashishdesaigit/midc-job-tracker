-- ═══════════════════════════════════════════════════════════════════════
-- DELETE test insights data
-- Removes only the data inserted by test_insights_data.sql
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_unit_id uuid;
BEGIN
  SELECT unit_id INTO v_unit_id FROM users WHERE role = 'owner' LIMIT 1;
  IF v_unit_id IS NULL THEN RAISE EXCEPTION 'No owner found'; END IF;

  -- Delete in FK order
  DELETE FROM subcontracts
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-1%');

  DELETE FROM dispatches
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-1%');

  DELETE FROM job_stage_log
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-1%');

  DELETE FROM job_comments
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-1%');

  DELETE FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-1%';

  -- Delete test customers (phone range 9876500001–9876500004)
  DELETE FROM customers WHERE unit_id = v_unit_id AND phone IN
    ('9876500001','9876500002','9876500003','9876500004');

  -- Delete test vendors (phone range 9876500010–9876500014)
  DELETE FROM vendors WHERE unit_id = v_unit_id AND phone IN
    ('9876500010','9876500011','9876500012','9876500013','9876500014');

  RAISE NOTICE 'Test data deleted.';
END;
$$;

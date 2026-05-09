-- ═══════════════════════════════════════════════════════════════════════
-- DELETE Desai Industries seed data
-- Removes only data inserted by desai_industries_seed.sql
-- Jobs J-201 to J-229 · phones 9876510001-9876510014
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_unit_id uuid := '95dd9442-ce2a-4ed6-98a1-88cc9a86e0c3';
BEGIN
  DELETE FROM vendor_payments WHERE unit_id = v_unit_id
    AND vendor_id IN (SELECT id FROM vendors WHERE unit_id = v_unit_id AND phone LIKE '987651001%');

  DELETE FROM subcontracts
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-2%');

  DELETE FROM dispatches
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-2%');

  DELETE FROM job_comments
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-2%');

  DELETE FROM job_stage_log
    WHERE job_id IN (SELECT id FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-2%');

  DELETE FROM jobs WHERE unit_id = v_unit_id AND job_number LIKE 'J-2%';

  DELETE FROM customers WHERE unit_id = v_unit_id AND phone IN
    ('9876510001','9876510002','9876510003','9876510004');

  DELETE FROM vendors WHERE unit_id = v_unit_id AND phone LIKE '987651001%';

  RAISE NOTICE 'Desai Industries seed data deleted.';
END;
$$;

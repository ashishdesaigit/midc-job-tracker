-- ═══════════════════════════════════════════════════════════════════════
-- JOBTRACK — Test data for Insights screen
-- Machine shop stages: Material Received → Setup → Turning → Milling
--   → Drilling → Inspection → Dispatch
-- Vendor-enabled stages: Turning, Milling, Drilling
-- 4 customers · 5 vendors · 12 March jobs · 17 April jobs
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_unit_id uuid;  v_user_id uuid;
  c_kbl uuid; c_sig uuid; c_rvc uuid; c_jyb uuid;
  v_pat uuid; v_shi uuid; v_kul uuid; v_aga uuid; v_deo uuid;
  -- s0=Material Received, s1=Setup, s2=Turning, s3=Milling, s4=Drilling, s5=Inspection, s6=Dispatch
  s0 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid;
  sn0 text; sn1 text; sn2 text; sn3 text; sn4 text; sn5 text; sn6 text;
  jid uuid;
  cn int := 200;
  dn int := 200;
  jn int := 100;
BEGIN
  SELECT unit_id, id INTO v_unit_id, v_user_id FROM users WHERE role = 'owner' LIMIT 1;
  IF v_unit_id IS NULL THEN RAISE EXCEPTION 'No owner found — complete /setup first'; END IF;

  SELECT id, name INTO s0, sn0 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 0;
  SELECT id, name INTO s1, sn1 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 1;
  SELECT id, name INTO s2, sn2 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 2;
  SELECT id, name INTO s3, sn3 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 3;
  SELECT id, name INTO s4, sn4 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 4;
  SELECT id, name INTO s5, sn5 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 5;
  SELECT id, name INTO s6, sn6 FROM stage_templates WHERE unit_id = v_unit_id ORDER BY order_index LIMIT 1 OFFSET 6;

  RAISE NOTICE 'Stages: %, %, %, %, %, %, %', sn0, sn1, sn2, sn3, sn4, sn5, sn6;

  -- ── Customers ─────────────────────────────────────────────────────────
  INSERT INTO customers (unit_id,name,phone,credit_days) VALUES (v_unit_id,'Kirloskar Brothers','9876500001',30) RETURNING id INTO c_kbl;
  INSERT INTO customers (unit_id,name,phone,credit_days) VALUES (v_unit_id,'Sigma Pumps, Sangli','9876500002',45) RETURNING id INTO c_sig;
  INSERT INTO customers (unit_id,name,phone,credit_days) VALUES (v_unit_id,'Ramco Valves','9876500003',30) RETURNING id INTO c_rvc;
  INSERT INTO customers (unit_id,name,phone,credit_days) VALUES (v_unit_id,'Jyoti Blowers, Pune','9876500004',30) RETURNING id INTO c_jyb;

  -- ── Vendors (matching vendor-enabled stages: Turning, Milling, Drilling)
  INSERT INTO vendors (unit_id,name,phone,work_types) VALUES (v_unit_id,'Patil Machining Works','9876500010',ARRAY['turning']) RETURNING id INTO v_pat;
  INSERT INTO vendors (unit_id,name,phone,work_types) VALUES (v_unit_id,'Shinde Precision Milling','9876500011',ARRAY['milling']) RETURNING id INTO v_shi;
  INSERT INTO vendors (unit_id,name,phone,work_types) VALUES (v_unit_id,'Kulkarni Drilling Works','9876500012',ARRAY['drilling']) RETURNING id INTO v_kul;
  INSERT INTO vendors (unit_id,name,phone,work_types) VALUES (v_unit_id,'Agarwal Turning Centre','9876500013',ARRAY['turning']) RETURNING id INTO v_aga;
  INSERT INTO vendors (unit_id,name,phone,work_types) VALUES (v_unit_id,'Deore CNC Works','9876500014',ARRAY['milling']) RETURNING id INTO v_deo;

  -- ════════════════════════════════════════════════════════════════════
  -- MARCH 2026 — 12 JOBS (all dispatched)
  -- Insights: avg cycle ~14d · Milling longest stage (~4d)
  -- Kulkarni (Drilling) 0% on time · Ramco worst customer
  -- ════════════════════════════════════════════════════════════════════

  -- M01 Pump Shaft · KBL · vendor Patil Turning ON TIME · due Mar20 · disp Mar15 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pump Shaft','Steel',50,0,185,'piece','2026-03-20',s6,'dispatched',v_user_id,'2026-03-01 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-02 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-03 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-06 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-10 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-12 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-15 10:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),50,'Turning OD 45mm, length 180mm, Ra 3.2',28,'2026-03-03','2026-03-06','2026-03-05','returned',sn2);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),50,'2026-03-15',v_user_id);dn:=dn+1;

  -- M02 Gear Housing · Sigma · no vendor · due Mar15 · disp Mar18 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Gear Housing','Cast Iron',30,0,210,'piece','2026-03-15',s6,'dispatched',v_user_id,'2026-03-02 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-02 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-04 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-08 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-12 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-14 14:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-18 10:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),30,'2026-03-18',v_user_id);dn:=dn+1;

  -- M03 Bearing Plate · Ramco · vendor Kulkarni Drilling LATE 2d · due Mar25 · disp Mar20 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Bearing Plate','Mild Steel',25,0,165,'piece','2026-03-25',s6,'dispatched',v_user_id,'2026-03-03 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-03 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-04 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-05 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-09 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-13 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-18 14:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-20 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),25,'Drilling 8xM12 holes, PCD 120mm',22,'2026-03-13','2026-03-15','2026-03-17','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-03-20',v_user_id);dn:=dn+1;

  -- M04 Coupling Flange · KBL · no vendor · due Mar22 · disp Mar19 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Coupling Flange','Mild Steel',100,0,95,'piece','2026-03-22',s6,'dispatched',v_user_id,'2026-03-04 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-04 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-05 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-06 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-14 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-16 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-19 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),100,'2026-03-19',v_user_id);dn:=dn+1;

  -- M05 Valve Spindle · Sigma · vendor Shinde Milling ON TIME · due Mar25 · disp Mar24 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Valve Spindle','Stainless Steel',60,0,320,'piece','2026-03-25',s6,'dispatched',v_user_id,'2026-03-05 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-05 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-06 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-07 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-17 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-20 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-24 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),60,'Milling keyway 8mm x 4mm depth, length 60mm',35,'2026-03-10','2026-03-15','2026-03-15','returned',sn3);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),60,'2026-03-24',v_user_id);dn:=dn+1;

  -- M06 Drive Shaft · Ramco · vendor Kulkarni Drilling LATE 5d · due Mar20 · disp Mar28 LATE 8d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Drive Shaft','EN36 Steel',40,0,275,'piece','2026-03-20',s6,'dispatched',v_user_id,'2026-03-01 14:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 14:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-04 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-08 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-11 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-25 14:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-28 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),40,'Drilling 6xM16 cross holes, depth 50mm',30,'2026-03-11','2026-03-15','2026-03-20','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),40,'2026-03-28',v_user_id);dn:=dn+1;

  -- M07 Bracket Assembly · KBL · no vendor · due Mar22 · disp Mar17 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Bracket Assembly','Mild Steel',20,0,145,'piece','2026-03-22',s6,'dispatched',v_user_id,'2026-03-05 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-05 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-06 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-13 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-14 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-17 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),20,'2026-03-17',v_user_id);dn:=dn+1;

  -- M08 Motor Housing · Sigma · vendor Agarwal Turning LATE 3d · due Mar28 · disp Mar25 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Motor Housing','Cast Iron',15,0,450,'piece','2026-03-28',s6,'dispatched',v_user_id,'2026-03-03 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-03 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-04 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-05 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-12 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-16 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-22 14:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-25 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_aga,'SC-'||lpad(cn::text,3,'0'),15,'Turning bore ID 150mm, depth 200mm',45,'2026-03-05','2026-03-08','2026-03-11','returned',sn2);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),15,'2026-03-25',v_user_id);dn:=dn+1;

  -- M09 Cam Shaft · Ramco · no vendor · due Mar22 · disp Mar30 LATE 8d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Cam Shaft','EN8 Steel',80,0,115,'piece','2026-03-22',s6,'dispatched',v_user_id,'2026-03-02 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-02 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-05 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-17 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-26 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-30 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),80,'2026-03-30',v_user_id);dn:=dn+1;

  -- M10 Pin Assembly · KBL · no vendor · due Mar30 · disp Mar23 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pin Assembly','EN24 Steel',50,0,55,'piece','2026-03-30',s6,'dispatched',v_user_id,'2026-03-10 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-10 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-11 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-12 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-15 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-17 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-19 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-23 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),50,'2026-03-23',v_user_id);dn:=dn+1;

  -- M11 Cover Plate · Sigma · no vendor · due Mar31 · disp Mar28 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Cover Plate','Mild Steel',35,0,120,'piece','2026-03-31',s6,'dispatched',v_user_id,'2026-03-12 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-12 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-13 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-14 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-18 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-21 10:00:00'),(jid,s5,sn5,v_user_id,'2026-03-24 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-28 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),35,'2026-03-28',v_user_id);dn:=dn+1;

  -- M12 Adapter Sleeve · Jyoti · vendor Deore Milling ON TIME · due Mar28 · disp Mar25 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_jyb,'Adapter Sleeve','EN8 Steel',25,0,195,'piece','2026-03-28',s6,'dispatched',v_user_id,'2026-03-08 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-08 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-09 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-10 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-13 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-18 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-20 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-25 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_deo,'SC-'||lpad(cn::text,3,'0'),25,'Milling flat 30mm wide x 5mm depth',32,'2026-03-13','2026-03-17','2026-03-17','returned',sn3);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-03-25',v_user_id);dn:=dn+1;

  -- ════════════════════════════════════════════════════════════════════
  -- APRIL 2026 — 17 JOBS (14 dispatched + 3 active)
  -- Insights: avg cycle ~15d · Milling still longest (~4.2d)
  -- Kulkarni 0% on time in April → insight fires
  -- ════════════════════════════════════════════════════════════════════

  -- A01 Pump Shaft 80mm · KBL · vendor Patil Turning ON TIME · due Apr10 · disp Apr8 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pump Shaft 80mm','EN36 Steel',35,0,220,'piece','2026-04-10',s6,'dispatched',v_user_id,'2026-04-01 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-02 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-03 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-04 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-06 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-07 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-08 11:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),35,'Turning OD 80mm, length 250mm',30,'2026-04-03','2026-04-04','2026-04-04','returned',sn2);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),35,'2026-04-08',v_user_id);dn:=dn+1;

  -- A02 Spline Shaft · Sigma · no vendor · due Apr12 · disp Apr15 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Spline Shaft','EN8 Steel',45,0,145,'piece','2026-04-12',s6,'dispatched',v_user_id,'2026-04-01 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-02 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-03 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-07 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-11 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-13 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-15 10:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),45,'2026-04-15',v_user_id);dn:=dn+1;

  -- A03 Stepped Bush · Ramco · vendor Kulkarni Drilling LATE 4d · due Apr15 · disp Apr20 LATE 5d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Stepped Bush','Brass',20,0,280,'piece','2026-04-15',s6,'dispatched',v_user_id,'2026-04-02 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-02 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-03 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-04 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-07 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-09 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-18 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),20,'Drilling 4xM10 tapped holes, PCD 80mm',55,'2026-04-09','2026-04-12','2026-04-16','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),20,'2026-04-20',v_user_id);dn:=dn+1;

  -- A04 Hex Collar · KBL · no vendor · due Apr18 · disp Apr16 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Hex Collar','Mild Steel',60,0,88,'piece','2026-04-18',s6,'dispatched',v_user_id,'2026-04-03 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-03 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-04 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-05 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-09 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-12 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-13 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-16 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),60,'2026-04-16',v_user_id);dn:=dn+1;

  -- A05 Worm Gear · Sigma · vendor Patil Turning ON TIME · due Apr20 · disp Apr18 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Worm Gear','EN36 Steel',25,0,380,'piece','2026-04-20',s6,'dispatched',v_user_id,'2026-04-04 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-04 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-05 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-06 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-09 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-14 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-16 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-18 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),25,'Turning OD 120mm, worm profile',32,'2026-04-06','2026-04-09','2026-04-09','returned',sn2);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-04-18',v_user_id);dn:=dn+1;

  -- A06 Spacer Ring · Ramco · no vendor · due Apr15 · disp Apr20 LATE 5d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Spacer Ring','Mild Steel',100,0,52,'piece','2026-04-15',s6,'dispatched',v_user_id,'2026-04-01 14:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 14:00:00'),(jid,s1,sn1,v_user_id,'2026-04-03 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-04 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-08 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-13 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-17 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),100,'2026-04-20',v_user_id);dn:=dn+1;

  -- A07 Eccentric Bush · KBL · vendor Shinde Milling LATE 3d · due Apr22 · disp Apr23 LATE 1d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Eccentric Bush','Bronze',15,0,520,'piece','2026-04-22',s6,'dispatched',v_user_id,'2026-04-05 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-05 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-06 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-09 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-17 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-21 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-23 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),15,'Milling eccentric profile, offset 8mm',40,'2026-04-09','2026-04-12','2026-04-15','returned',sn3);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),15,'2026-04-23',v_user_id);dn:=dn+1;

  -- A08 Taper Shank · Sigma · no vendor · due Apr22 · disp Apr20 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Taper Shank','EN24 Steel',40,0,175,'piece','2026-04-22',s6,'dispatched',v_user_id,'2026-04-06 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-06 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-07 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-08 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-12 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-16 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-18 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),40,'2026-04-20',v_user_id);dn:=dn+1;

  -- A09 Connecting Rod · Ramco · vendor Kulkarni Drilling LATE 5d · due Apr18 · disp Apr25 LATE 7d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Connecting Rod','EN8 Steel',60,0,68,'piece','2026-04-18',s6,'dispatched',v_user_id,'2026-04-04 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-04 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-05 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-06 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-13 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-23 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-25 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),60,'Drilling big-end bore 45mm, small-end 30mm',25,'2026-04-13','2026-04-16','2026-04-21','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),60,'2026-04-25',v_user_id);dn:=dn+1;

  -- A10 Roller Pin · KBL · no vendor · due Apr25 · disp Apr23 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Roller Pin','EN36 Steel',8,0,890,'piece','2026-04-25',s6,'dispatched',v_user_id,'2026-04-07 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-07 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-08 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-09 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-13 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-17 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-19 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-23 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),8,'2026-04-23',v_user_id);dn:=dn+1;

  -- A11 Rack Gear · Sigma · vendor Patil Turning ON TIME · due Apr28 · disp Apr26 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Rack Gear','EN8 Steel',70,0,48,'piece','2026-04-28',s6,'dispatched',v_user_id,'2026-04-10 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-10 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-11 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-12 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-16 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-20 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-23 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-26 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),70,'Turning blank OD 60mm x length 200mm',22,'2026-04-12','2026-04-15','2026-04-15','returned',sn2);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),70,'2026-04-26',v_user_id);dn:=dn+1;

  -- A12 Sleeve Bearing · Ramco · vendor Shinde Milling ON TIME · due Apr25 · disp Apr26 LATE 1d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Sleeve Bearing','Bronze',20,0,240,'piece','2026-04-25',s6,'dispatched',v_user_id,'2026-04-08 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-08 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-09 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-10 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-13 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-20 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-23 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-26 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),20,'Milling oil groove 5mm wide, 3mm deep spiral',38,'2026-04-13','2026-04-17','2026-04-17','returned',sn3);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),20,'2026-04-26',v_user_id);dn:=dn+1;

  -- A13 End Cap · KBL · no vendor · due Apr30 · disp Apr28 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'End Cap','Mild Steel',30,0,195,'piece','2026-04-30',s6,'dispatched',v_user_id,'2026-04-12 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-12 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-13 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-14 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-18 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-22 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-24 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-28 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),30,'2026-04-28',v_user_id);dn:=dn+1;

  -- A14 Retention Ring · Sigma · no vendor · due Apr28 · disp Apr30 LATE 2d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Retention Ring','EN8 Steel',25,0,155,'piece','2026-04-28',s6,'dispatched',v_user_id,'2026-04-13 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-13 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-14 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-15 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-19 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-23 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-27 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-30 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-04-30',v_user_id);dn:=dn+1;

  -- A15 Differential Housing · KBL · ACTIVE in Inspection
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Differential Housing','Cast Iron',12,12,680,'piece','2026-05-08',s5,'active',v_user_id,'2026-04-20 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-20 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-21 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-22 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-26 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-29 09:00:00'),(jid,s5,sn5,v_user_id,'2026-05-03 10:00:00');

  -- A16 Lead Screw · Sigma · ACTIVE in Turning stage
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Lead Screw','EN8 Steel',35,35,125,'piece','2026-05-12',s2,'active',v_user_id,'2026-04-28 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-28 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-29 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-30 14:00:00');

  -- A17 Flange Yoke · Ramco · ACTIVE in Drilling (pending Kulkarni)
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Flange Yoke','EN36 Steel',50,50,95,'piece','2026-05-10',s4,'active',v_user_id,'2026-04-25 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-25 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-26 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-28 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-30 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-05-02 10:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),50,'Drilling 6xM16 holes, PCD 160mm',30,'2026-05-02','2026-05-06','pending',sn4);

  RAISE NOTICE 'Done. 4 customers · 5 vendors · 12 March jobs (all dispatched) · 17 April jobs (14 dispatched + 3 active)';
  RAISE NOTICE 'Insights to see: Milling longest stage · Kulkarni Drilling consistently late · Ramco worst delivery customer';
END;
$$;

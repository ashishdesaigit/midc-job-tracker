-- ═══════════════════════════════════════════════════════════════════════
-- DESAI INDUSTRIES — Realistic foundry data seed
-- Unit: 95dd9442-ce2a-4ed6-98a1-88cc9a86e0c3
-- Stages: Pattern Check → Moulding → Pouring → Shakeout →
--         Fettling (vendor) → Inspection → Dispatch
-- 4 customers · 5 vendors · 12 March jobs · 17 April jobs
-- Includes: stage logs, subcontracts, dispatches, comments, vendor payments
-- ═══════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_unit_id uuid := '95dd9442-ce2a-4ed6-98a1-88cc9a86e0c3';
  v_user_id uuid;

  c_kbl uuid; c_sig uuid; c_rvc uuid; c_fmc uuid;
  v_pat uuid; v_shi uuid; v_kul uuid; v_aga uuid; v_deo uuid;

  s0 uuid; s1 uuid; s2 uuid; s3 uuid; s4 uuid; s5 uuid; s6 uuid;
  sn0 text; sn1 text; sn2 text; sn3 text; sn4 text; sn5 text; sn6 text;

  jid uuid;
  cn int := 300;
  dn int := 300;
  jn int := 200;
BEGIN
  SELECT id INTO v_user_id FROM users WHERE unit_id = v_unit_id AND role = 'owner' LIMIT 1;
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Owner not found for Desai Industries'; END IF;

  SELECT id,name INTO s0,sn0 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 0;
  SELECT id,name INTO s1,sn1 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 1;
  SELECT id,name INTO s2,sn2 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 2;
  SELECT id,name INTO s3,sn3 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 3;
  SELECT id,name INTO s4,sn4 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 4;
  SELECT id,name INTO s5,sn5 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 5;
  SELECT id,name INTO s6,sn6 FROM stage_templates WHERE unit_id=v_unit_id ORDER BY order_index LIMIT 1 OFFSET 6;

  RAISE NOTICE 'Stages: % / % / % / % / % / % / %', sn0,sn1,sn2,sn3,sn4,sn5,sn6;

  -- ── Customers ──────────────────────────────────────────────────────────
  INSERT INTO customers(unit_id,name,phone,gstin,credit_days) VALUES
    (v_unit_id,'Kirloskar Brothers Ltd','9876510001','27AABCK1234Z1Z5',30) RETURNING id INTO c_kbl;
  INSERT INTO customers(unit_id,name,phone,gstin,credit_days) VALUES
    (v_unit_id,'Sigma Pumps Pvt Ltd','9876510002','27AABCS9876P1Z3',45) RETURNING id INTO c_sig;
  INSERT INTO customers(unit_id,name,phone,gstin,credit_days) VALUES
    (v_unit_id,'Ramco Industries','9876510003','27AABCR4567Q1Z2',30) RETURNING id INTO c_rvc;
  INSERT INTO customers(unit_id,name,phone,credit_days) VALUES
    (v_unit_id,'Force Motors Ltd','9876510004',60) RETURNING id INTO c_fmc;

  -- ── Vendors (Fettling specialists) ────────────────────────────────────
  INSERT INTO vendors(unit_id,name,phone,work_types) VALUES
    (v_unit_id,'Patil Fettling Works','9876510010',ARRAY['other']) RETURNING id INTO v_pat;
  INSERT INTO vendors(unit_id,name,phone,work_types) VALUES
    (v_unit_id,'Shinde Metal Finishing','9876510011',ARRAY['heat_treatment']) RETURNING id INTO v_shi;
  INSERT INTO vendors(unit_id,name,phone,work_types) VALUES
    (v_unit_id,'Kulkarni Abrasive Works','9876510012',ARRAY['grinding']) RETURNING id INTO v_kul;
  INSERT INTO vendors(unit_id,name,phone,work_types) VALUES
    (v_unit_id,'Agarwal Shot Blasting','9876510013',ARRAY['other']) RETURNING id INTO v_aga;
  INSERT INTO vendors(unit_id,name,phone,work_types) VALUES
    (v_unit_id,'Deore Surface Treatment','9876510014',ARRAY['plating']) RETURNING id INTO v_deo;

  -- ════════════════════════════════════════════════════════════════════
  -- MARCH 2026 — 12 JOBS (all dispatched)
  -- Insights: Moulding longest (~4d avg) · Kulkarni 0% on time
  -- Ramco 1/3 on time · overall 58% on time
  -- ════════════════════════════════════════════════════════════════════

  -- M01 Pump Body 200mm · Kirloskar · Fettling→Patil ON TIME · due Mar20 · disp Mar16 EARLY
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pump Body 200mm','SG Iron',25,0,850,'piece','2026-03-20',s6,'dispatched',v_user_id,'2026-03-01 08:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 08:00:00'),(jid,s1,sn1,v_user_id,'2026-03-02 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-07 11:00:00'),(jid,s3,sn3,v_user_id,'2026-03-08 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-09 08:00:00'),(jid,s5,sn5,v_user_id,'2026-03-13 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-16 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),25,'Fettling — gate removal, riser cutting, surface grinding',120,'2026-03-09','2026-03-13','2026-03-12','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-03-16','MH09 AK 4521',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Sand mix ratio adjusted — added 3% bentonite for better green strength. Pattern alignment checked.',NULL,v_user_id),
    (jid,s2,sn2,'Pouring temperature 1380°C. Metal fluidity good. No cold shuts observed.','https://picsum.photos/seed/pour-m01/800/600',v_user_id),
    (jid,s5,sn5,'Dimensional inspection passed. All critical dimensions within ±0.3mm. Surface finish Ra 12.5 achieved.',NULL,v_user_id);

  -- M02 Valve Casing · Sigma · no vendor · due Mar15 · disp Mar18 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Valve Casing 100mm','Grey Iron',40,0,420,'piece','2026-03-15',s6,'dispatched',v_user_id,'2026-03-01 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-02 14:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-08 11:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-09 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-14 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-18 08:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),40,'2026-03-18',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Pattern warpage found. Core box repaired before moulding. 4 hours delay.',NULL,v_user_id),
    (jid,s4,sn4,'Internal fettling done. 6 pcs had heavy flash — extra time needed for manual grinding.',NULL,v_user_id);

  -- M03 Bearing Housing · Ramco · Fettling→Kulkarni LATE 4d · due Mar22 · disp Mar25 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Bearing Housing','SG Iron',15,0,1100,'piece','2026-03-22',s6,'dispatched',v_user_id,'2026-03-02 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-02 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-08 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-09 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-10 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-23 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-25 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),15,'Shot blasting + fettling of bearing bores',180,'2026-03-10','2026-03-14','2026-03-18','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),15,'2026-03-25',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Core making required extra care for bearing bore profile. Two cores rejected.','https://picsum.photos/seed/core-m03/800/600',v_user_id),
    (jid,s3,sn3,'Shakeout: 2 pcs had minor blow holes near top riser. Marked for inspection.',NULL,v_user_id),
    (jid,s5,sn5,'3 pieces rejected — blow holes exceeded 3mm limit. 12 pcs passed. Informed customer.',NULL,v_user_id);

  -- M04 Impeller 250mm · Kirloskar · no vendor · due Mar22 · disp Mar20 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Impeller 250mm','SG Iron',30,0,680,'piece','2026-03-22',s6,'dispatched',v_user_id,'2026-03-03 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-03 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-04 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-09 11:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-11 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-15 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-20 08:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),30,'2026-03-20','MH09 BK 7832',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'Pouring done in two heats. Second heat temperature 1360°C — slightly low but acceptable.',NULL,v_user_id),
    (jid,s4,sn4,'Vane profiles cleaned manually. Good surface finish achieved.',NULL,v_user_id);

  -- M05 Gear Box Cover · Force Motors · Fettling→Shinde ON TIME · due Mar28 · disp Mar26 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_fmc,'Gear Box Cover','Grey Iron',50,0,380,'piece','2026-03-28',s6,'dispatched',v_user_id,'2026-03-05 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-05 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-06 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-10 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-11 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-12 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-21 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-26 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),50,'Stress relief annealing + fettling parting line',95,'2026-03-12','2026-03-18','2026-03-18','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),50,'2026-03-26',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'50 moulds prepared in 2 batches. Pattern condition good.','https://picsum.photos/seed/mould-m05/800/600',v_user_id),
    (jid,s5,sn5,'All 50 pieces passed. Gasket face flatness within 0.1mm. Customer will be happy.',NULL,v_user_id);

  -- M06 Flange Assembly · Sigma · no vendor · due Mar20 · disp Mar24 LATE 4d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Flange Assembly DN150','Grey Iron',100,0,180,'piece','2026-03-20',s6,'dispatched',v_user_id,'2026-03-01 14:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 14:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-08 14:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-11 14:00:00'),(jid,s5,sn5,v_user_id,'2026-03-19 09:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-24 08:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),100,'2026-03-24',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Large batch — 100 moulds. Took extra day for preparation. No major issues.',NULL,v_user_id),
    (jid,s4,sn4,'Heavy flash on parting line for 15 pieces. Extra grinding time. This caused delay.',NULL,v_user_id);

  -- M07 Motor Housing · Ramco · Fettling→Kulkarni LATE 5d · due Mar18 · disp Mar28 LATE 10d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Motor Housing 300mm','SG Iron',10,0,2200,'piece','2026-03-18',s6,'dispatched',v_user_id,'2026-03-01 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-01 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-02 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-08 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-09 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-25 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-28 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,qty_rejected,rejection_note,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),10,'Shot blasting + heavy fettling of cooling fins',350,1,'Cooling fin broken during aggressive blasting','2026-03-09','2026-03-13','2026-03-18','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),9,'2026-03-28',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Complex core assembly for motor housing. 3 cores per piece. Trial mould done first.','https://picsum.photos/seed/core-housing/800/600',v_user_id),
    (jid,s5,sn5,'1 piece rejected at inspection — broken cooling fin from Kulkarni. 9 pieces dispatched. Informed Ramco.',NULL,v_user_id);

  -- M08 Manifold Block · Kirloskar · Fettling→Patil LATE 2d · due Mar25 · disp Mar24 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Manifold Block','SG Iron',20,0,950,'piece','2026-03-25',s6,'dispatched',v_user_id,'2026-03-05 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-05 10:00:00'),(jid,s1,sn1,v_user_id,'2026-03-06 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-10 11:00:00'),(jid,s3,sn3,v_user_id,'2026-03-11 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-12 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-21 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-24 08:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),20,'Fettling internal passages, riser cutting, deburring',145,'2026-03-12','2026-03-16','2026-03-18','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),20,'2026-03-24','MH09 CK 3344',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s0,sn0,'Pattern dimensions verified with customer drawing. Minor modification done to riser size.',NULL,v_user_id),
    (jid,s5,sn5,'Internal passages checked with compressed air test. All 20 pieces passed.',NULL,v_user_id);

  -- M09 Column Box · Force Motors · no vendor · due Mar20 · disp Mar30 LATE 10d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_fmc,'Column Box','Grey Iron',35,0,520,'piece','2026-03-20',s6,'dispatched',v_user_id,'2026-03-02 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-02 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-03 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-08 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-12 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-25 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-30 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),35,'2026-03-30',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Sand porosity issue in batch 2. Remixed sand with new bentonite. Third batch ok.','https://picsum.photos/seed/sand-m09/800/600',v_user_id),
    (jid,s4,sn4,'Internal fettling very time consuming due to complex box shape. 5 extra days needed.',NULL,v_user_id);

  -- M10 Suction Casing · Sigma · Fettling→Patil ON TIME · due Mar28 · disp Mar26 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Suction Casing','SG Iron',12,0,1450,'piece','2026-03-28',s6,'dispatched',v_user_id,'2026-03-08 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-08 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-09 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-13 11:00:00'),(jid,s3,sn3,v_user_id,'2026-03-14 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-15 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-22 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-26 08:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),12,'Full fettling — runner removal, suction bore cleaning',190,'2026-03-15','2026-03-20','2026-03-19','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),12,'2026-03-26','MH09 AK 4521',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'Pouring excellent — 1390°C. Cast iron fluidity perfect for complex casing.',NULL,v_user_id),
    (jid,s5,sn5,'Hydro test passed at 6 bar. No leakage. Ready for dispatch.',NULL,v_user_id);

  -- M11 End Plate 400mm · Ramco · no vendor · due Mar25 · disp Mar28 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'End Plate 400mm','Grey Iron',60,0,220,'piece','2026-03-25',s6,'dispatched',v_user_id,'2026-03-06 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-06 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-07 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-11 09:00:00'),(jid,s3,sn3,v_user_id,'2026-03-12 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-13 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-22 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-28 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),60,'2026-03-28',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'60 plates moulded in 3 days. Night shift utilized.',NULL,v_user_id),
    (jid,s4,sn4,'Face grinding required on 8 plates — flatness issue. Corrected.',NULL,v_user_id);

  -- M12 Impeller 300mm · Kirloskar · no vendor · due Mar30 · disp Mar28 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at,photo_url)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Impeller 300mm','SG Iron',8,0,3200,'piece','2026-03-30',s6,'dispatched',v_user_id,'2026-03-12 09:00:00','https://picsum.photos/seed/impeller-drawing/600/800') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-03-12 09:00:00'),(jid,s1,sn1,v_user_id,'2026-03-13 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-03-18 11:00:00'),(jid,s3,sn3,v_user_id,'2026-03-19 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-03-20 09:00:00'),(jid,s5,sn5,v_user_id,'2026-03-24 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-03-28 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),8,'2026-03-28','MH09 BK 7832',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'High-pressure impeller. Ceramic coated pattern used. Extra care in vane profile.','https://picsum.photos/seed/vane-profile/800/600',v_user_id),
    (jid,s2,sn2,'Pouring in special high-temperature SG iron mix. Mg treatment done properly.',NULL,v_user_id),
    (jid,s5,sn5,'Dynamic balance check done. All 8 within tolerance G6.3. Kirloskar will be pleased.','https://picsum.photos/seed/inspection-imp/800/600',v_user_id);

  -- ════════════════════════════════════════════════════════════════════
  -- APRIL 2026 — 17 JOBS (14 dispatched + 3 active)
  -- Better Moulding insight · Kulkarni still 0% on time
  -- ════════════════════════════════════════════════════════════════════

  -- A01 Pump Body 250mm · Kirloskar · Fettling→Patil ON TIME · due Apr10 · disp Apr8 EARLY
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pump Body 250mm','SG Iron',18,0,1100,'piece','2026-04-10',s6,'dispatched',v_user_id,'2026-04-01 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-02 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-05 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-06 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-07 08:00:00'),(jid,s5,sn5,v_user_id,'2026-04-07 16:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-08 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),18,'Fettling pump body — runner, riser, parting line',140,'2026-04-07','2026-04-07','2026-04-07','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),18,'2026-04-08',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'Excellent pour. 1385°C. Clean metal — slag removed properly before pouring.',NULL,v_user_id);

  -- A02 Volute Casing · Sigma · no vendor · due Apr12 · disp Apr15 LATE 3d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Volute Casing','Grey Iron',30,0,560,'piece','2026-04-12',s6,'dispatched',v_user_id,'2026-04-01 14:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 14:00:00'),(jid,s1,sn1,v_user_id,'2026-04-02 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-07 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-09 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-10 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-13 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-15 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),30,'2026-04-15',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Volute profile is complex. Pattern condition good but requires careful moulding.',NULL,v_user_id),
    (jid,s4,sn4,'Volute passage cleaning took extra day. Water channel cleared manually.',NULL,v_user_id);

  -- A03 Plummer Block · Ramco · Fettling→Kulkarni LATE 5d · due Apr15 · disp Apr22 LATE 7d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Plummer Block','SG Iron',25,0,780,'piece','2026-04-15',s6,'dispatched',v_user_id,'2026-04-02 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-02 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-03 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-08 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-09 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-20 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-22 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),25,'Shot blasting + fettling bearing seating area',160,'2026-04-09','2026-04-13','2026-04-18','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),25,'2026-04-22',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s5,sn5,'Bearing seat concentricity checked. All within 0.05mm. Kulkarni late again — 5 days overdue.','https://picsum.photos/seed/bearing-check/800/600',v_user_id);

  -- A04 Throttle Body · Kirloskar · no vendor · due Apr18 · disp Apr16 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Throttle Body','Aluminium',45,0,320,'piece','2026-04-18',s6,'dispatched',v_user_id,'2026-04-03 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-03 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-04 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-07 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-08 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-09 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-12 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-16 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),45,'2026-04-16','MH09 CK 3344',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'Aluminium pour at 720°C. Degassing done. No porosity in first 10 pieces checked.',NULL,v_user_id);

  -- A05 Worm Gear Housing · Sigma · Fettling→Shinde ON TIME · due Apr20 · disp Apr19 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Worm Gear Housing','Grey Iron',20,0,890,'piece','2026-04-20',s6,'dispatched',v_user_id,'2026-04-04 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-04 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-05 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-09 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-10 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-11 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-17 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-19 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),20,'Stress relief + fettling worm bore area',130,'2026-04-11','2026-04-15','2026-04-15','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),20,'2026-04-19',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Worm bore alignment critical. Pattern checked with go/no-go gauge before moulding.',NULL,v_user_id),
    (jid,s5,sn5,'Worm bore and gear seat checked with CMM. All within spec.',NULL,v_user_id);

  -- A06 Bracket Casting · Ramco · no vendor · due Apr15 · disp Apr20 LATE 5d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Bracket Casting','Grey Iron',80,0,195,'piece','2026-04-15',s6,'dispatched',v_user_id,'2026-04-01 14:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-01 14:00:00'),(jid,s1,sn1,v_user_id,'2026-04-03 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-08 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-10 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-12 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-17 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),80,'2026-04-20',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'80-piece batch. Moulding done in 4 shifts over 2 days.',NULL,v_user_id),
    (jid,s4,sn4,'Large batch fettling took 5 days. Manual grinding required.',NULL,v_user_id);

  -- A07 Diffuser Ring · Kirloskar · Fettling→Patil ON TIME · due Apr22 · disp Apr20 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Diffuser Ring','SG Iron',14,0,1850,'piece','2026-04-22',s6,'dispatched',v_user_id,'2026-04-05 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-05 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-06 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-10 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-11 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-12 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-18 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),14,'Precision fettling of diffuser vane profiles',220,'2026-04-12','2026-04-17','2026-04-16','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),14,'2026-04-20','MH09 AK 4521',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Diffuser vane pattern — 14 cavities per box. Ceramic cores used for vane passages.',NULL,v_user_id),
    (jid,s5,sn5,'Flow area measured at each vane passage. Tolerance ±0.5mm maintained.',NULL,v_user_id);

  -- A08 Reduction Gear Case · Sigma · no vendor · due Apr22 · disp Apr20 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Reduction Gear Case','Grey Iron',12,0,2100,'piece','2026-04-22',s6,'dispatched',v_user_id,'2026-04-06 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-06 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-07 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-11 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-12 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-13 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-17 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-20 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),12,'2026-04-20',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'12 pieces — complex gear case with multiple cores. No shrinkage defects.','https://picsum.photos/seed/gearcase-pour/800/600',v_user_id);

  -- A09 Pump Cover · Ramco · Fettling→Kulkarni LATE 4d · due Apr18 · disp Apr24 LATE 6d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Pump Cover','SG Iron',22,0,650,'piece','2026-04-18',s6,'dispatched',v_user_id,'2026-04-04 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-04 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-05 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-09 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-10 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-11 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-22 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-24 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),22,'Shot blasting + fettling pump cover sealing face',150,'2026-04-11','2026-04-15','2026-04-19','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),22,'2026-04-24',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s5,sn5,'Kulkarni returned 4 days late again. Sealing face surface finish Ra 6.3. Accepted.',NULL,v_user_id);

  -- A10 Turbine Casing · Kirloskar · no vendor · due Apr25 · disp Apr23 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Turbine Casing','SG Iron',6,0,4200,'piece','2026-04-25',s6,'dispatched',v_user_id,'2026-04-07 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-07 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-08 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-12 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-13 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-14 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-19 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-23 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),6,'2026-04-23','MH09 BK 7832',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'High-value job. Director came to see moulding process. Extra care taken.','https://picsum.photos/seed/turbine-mould/800/600',v_user_id),
    (jid,s5,sn5,'Pressure test at 8 bar for 30 min. No leakage. Excellent quality.','https://picsum.photos/seed/pressure-test/800/600',v_user_id);

  -- A11 Pipe Tee Body · Sigma · Fettling→Patil ON TIME · due Apr28 · disp Apr26 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Pipe Tee Body DN200','Grey Iron',55,0,340,'piece','2026-04-28',s6,'dispatched',v_user_id,'2026-04-10 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-10 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-11 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-15 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-17 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-18 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-23 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-26 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_pat,'SC-'||lpad(cn::text,3,'0'),55,'Fettling all three bores of tee body',85,'2026-04-18','2026-04-22','2026-04-22','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),55,'2026-04-26',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'55 tee bodies poured in 3 heats. All clean pours.',NULL,v_user_id);

  -- A12 Flywheel Housing · Ramco · Fettling→Shinde ON TIME · due Apr25 · disp Apr26 LATE 1d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Flywheel Housing','SG Iron',8,0,2800,'piece','2026-04-25',s6,'dispatched',v_user_id,'2026-04-08 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-08 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-09 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-13 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-14 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-15 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-23 10:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-26 09:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,actual_return_date,status,stage_name)
  VALUES(jid,v_shi,'SC-'||lpad(cn::text,3,'0'),8,'Stress relief treatment + parting line fettling',380,'2026-04-15','2026-04-20','2026-04-20','returned',sn4);cn:=cn+1;
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),8,'2026-04-26',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Critical heavy casting — 85kg each. Green sand moulding with special backing.',NULL,v_user_id),
    (jid,s5,sn5,'Run-out checked on CMM. All 8 pieces within 0.08mm TIR. Customer will be satisfied.',NULL,v_user_id);

  -- A13 Inlet Manifold · Kirloskar · no vendor · due Apr30 · disp Apr28 ON TIME
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Inlet Manifold','Grey Iron',28,0,740,'piece','2026-04-30',s6,'dispatched',v_user_id,'2026-04-12 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-12 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-13 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-17 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-18 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-19 09:00:00'),(jid,s5,sn5,v_user_id,'2026-04-24 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-28 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,vehicle_info,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),28,'2026-04-28','MH09 AK 4521',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s1,sn1,'Complex manifold with 4 inlet ports. Core assembly critical — all cores fit-checked.',NULL,v_user_id),
    (jid,s5,sn5,'Air flow test done at 2 bar. All passages clear. Ready for dispatch.',NULL,v_user_id);

  -- A14 Volute Body · Sigma · no vendor · due Apr28 · disp Apr30 LATE 2d
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_sig,'Volute Body 100mm','SG Iron',22,0,920,'piece','2026-04-28',s6,'dispatched',v_user_id,'2026-04-13 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-13 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-14 09:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-18 14:00:00'),(jid,s3,sn3,v_user_id,'2026-04-20 09:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-21 10:00:00'),(jid,s5,sn5,v_user_id,'2026-04-26 11:00:00'),
    (jid,s6,sn6,v_user_id,'2026-04-30 09:00:00');
  INSERT INTO dispatches(job_id,dc_number,qty_dispatched,dispatch_date,created_by)
  VALUES(jid,'DC-'||lpad(dn::text,3,'0'),22,'2026-04-30',v_user_id);dn:=dn+1;
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s4,sn4,'Internal volute passage cleaning required extra day. Used pneumatic tools.',NULL,v_user_id);

  -- A15 Column Pipe · Force Motors · ACTIVE at Inspection
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at,photo_url)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_fmc,'Column Pipe Casting','Grey Iron',16,16,1250,'piece','2026-05-10',s5,'active',v_user_id,'2026-04-20 09:00:00','https://picsum.photos/seed/column-pipe/600/800') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-20 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-21 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-25 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-26 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-04-27 09:00:00'),(jid,s5,sn5,v_user_id,'2026-05-03 10:00:00');
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s2,sn2,'Long column pipe casting — 1200mm. Special flask arrangement.',NULL,v_user_id),
    (jid,s5,sn5,'Straightness checking in progress. 3 pieces need correction.',NULL,v_user_id);

  -- A16 Pump Bracket · Kirloskar · ACTIVE at Moulding
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_kbl,'Pump Bracket Heavy','SG Iron',32,32,580,'piece','2026-05-15',s1,'active',v_user_id,'2026-04-28 10:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-28 10:00:00'),(jid,s1,sn1,v_user_id,'2026-04-29 09:00:00');
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s0,sn0,'New pattern received from Kirloskar. Pattern checked — minor adjustment to gating system done.',NULL,v_user_id);

  -- A17 Flange Casting · Ramco · ACTIVE at Fettling (vendor pending — Kulkarni)
  jn:=jn+1;
  INSERT INTO jobs(unit_id,job_number,customer_id,part_name,material,qty_ordered,qty_balance,rate,rate_unit,due_date,current_stage_id,status,created_by,created_at)
  VALUES(v_unit_id,'J-'||lpad(jn::text,3,'0'),c_rvc,'Discharge Flange','Grey Iron',48,48,280,'piece','2026-05-12',s4,'active',v_user_id,'2026-04-25 09:00:00') RETURNING id INTO jid;
  INSERT INTO job_stage_log(job_id,stage_id,stage_name,moved_by,moved_at) VALUES
    (jid,s0,sn0,v_user_id,'2026-04-25 09:00:00'),(jid,s1,sn1,v_user_id,'2026-04-26 10:00:00'),
    (jid,s2,sn2,v_user_id,'2026-04-29 09:00:00'),(jid,s3,sn3,v_user_id,'2026-04-30 14:00:00'),
    (jid,s4,sn4,v_user_id,'2026-05-02 10:00:00');
  INSERT INTO subcontracts(job_id,vendor_id,challan_ref,qty_sent,operation_desc,rate_per_piece,sent_date,expected_return,status,stage_name)
  VALUES(jid,v_kul,'SC-'||lpad(cn::text,3,'0'),48,'Shot blasting + face fettling of flange mating surface',90,'2026-05-02','2026-05-06','pending',sn4);
  INSERT INTO job_comments(job_id,stage_id,stage_name,comment,photo_url,created_by) VALUES
    (jid,s4,sn4,'Sent to Kulkarni on May 2. Expected back May 6. Watching closely — they have history of delays.',NULL,v_user_id);

  -- ── Vendor payments (to show payment summary on vendor pages) ─────────
  INSERT INTO vendor_payments(vendor_id,unit_id,amount,note,paid_by,paid_at) VALUES
    (v_pat,v_unit_id,15000,'March payment — full settlement',v_user_id,'2026-03-31 10:00:00'),
    (v_pat,v_unit_id,8500,'April advance payment',v_user_id,'2026-04-15 10:00:00'),
    (v_shi,v_unit_id,7200,'March payment',v_user_id,'2026-03-30 11:00:00'),
    (v_shi,v_unit_id,5200,'April partial payment',v_user_id,'2026-04-20 10:00:00'),
    (v_kul,v_unit_id,5000,'March partial — withheld 30% for delays',v_user_id,'2026-03-29 10:00:00');

  RAISE NOTICE 'Done. 4 customers · 5 vendors · 12 March jobs (all dispatched) · 17 April jobs (14 dispatched + 3 active)';
  RAISE NOTICE 'Insights: Moulding longest stage · Kulkarni Abrasives 0%% on time (red) · Ramco 25%% on time · overall 58%% Mar / 64%% Apr';
END;
$$;

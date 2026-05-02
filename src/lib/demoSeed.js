import { supabase } from './supabase'
import { nextJobNumber, nextChallanRef, nextDcNumber } from './numbering'

const CUSTOMERS = [
  { name: 'Kirloskar Brothers',  phone: '9876500001' },
  { name: 'Sigma Pumps, Sangli', phone: '9876500002' },
  { name: 'Ramco Valves',        phone: '9876500003' },
]

const VENDORS = [
  { name: 'Patil Boring Works',     phone: '9876500010', work_types: ['boring'] },
  { name: 'Shinde Heat Treatment',  phone: '9876500011', work_types: ['heat_treatment'] },
  { name: 'Kulkarni Grinding',      phone: '9876500012', work_types: ['grinding'] },
]

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}

function matchStage(stages, name) {
  return (
    stages.find(s => s.name.toLowerCase() === name.toLowerCase()) ??
    stages.find(s => s.name.toLowerCase().includes(name.toLowerCase().split(' ')[0])) ??
    stages[0]
  )
}

export async function loadDemoData(unitId, userId) {
  // Insert customers
  const { data: customers, error: custErr } = await supabase
    .from('customers')
    .insert(CUSTOMERS.map(c => ({ ...c, unit_id: unitId })))
    .select()
  if (custErr) throw custErr

  // Insert vendors
  const { data: vendors, error: venErr } = await supabase
    .from('vendors')
    .insert(VENDORS.map(v => ({ ...v, unit_id: unitId })))
    .select()
  if (venErr) throw venErr

  const cust = (name) => customers.find(c => c.name === name)
  const vend = (name) => vendors.find(v => v.name === name)

  // Fetch stages
  const { data: stages } = await supabase
    .from('stage_templates')
    .select('*')
    .eq('unit_id', unitId)
    .order('order_index')
  if (!stages?.length) throw new Error('Stages not found')

  const firstStage      = stages[0]
  const subStage        = stages.find(s => s.is_subcontract)
  const lastStage       = stages[stages.length - 1]
  const inspectionStage = stages.find(s => s.name.toLowerCase().includes('inspect')) ?? stages[stages.length - 2]

  const JOBS = [
    { part_name: 'Pump Body',      customer: 'Kirloskar Brothers',  qty: 50,  material: 'SG Iron',   rate: 185, stage: 'Moulding',    due_days:  5 },
    { part_name: 'Impeller',       customer: 'Sigma Pumps, Sangli', qty: 30,  material: 'SG Iron',   rate: 210, stage: 'At Vendor',   due_days: -1, vendor: 'Patil Boring Works' },
    { part_name: 'Valve Body 65mm',customer: 'Ramco Valves',        qty: 25,  material: 'Grey Iron', rate: 165, stage: 'Inspection',  due_days:  1 },
    { part_name: 'Gear Blank',     customer: 'Kirloskar Brothers',  qty: 100, material: 'Grey Iron', rate: 95,  stage: 'Pouring',     due_days:  8 },
    { part_name: 'Bracket',        customer: 'Sigma Pumps, Sangli', qty: 60,  material: 'Grey Iron', rate: 75,  stage: 'Dispatched',  due_days: -5 },
    { part_name: 'Flange 80mm',    customer: 'Ramco Valves',        qty: 40,  material: 'Grey Iron', rate: 130, stage: 'At Vendor',   due_days: -2, vendor: 'Shinde Heat Treatment' },
  ]

  for (const def of JOBS) {
    const jobNumber = await nextJobNumber(unitId)
    const customer  = cust(def.customer)
    if (!customer) continue

    let stageId
    if (def.stage === 'At Vendor')  stageId = (subStage ?? firstStage).id
    else if (def.stage === 'Dispatched') stageId = lastStage.id
    else if (def.stage === 'Inspection') stageId = inspectionStage.id
    else stageId = (matchStage(stages, def.stage) ?? firstStage).id

    const { data: job, error: jobErr } = await supabase.from('jobs').insert({
      unit_id: unitId,
      job_number: jobNumber,
      customer_id: customer.id,
      part_name: def.part_name,
      material: def.material,
      qty_ordered: def.qty,
      qty_balance: def.stage === 'Dispatched' ? 0 : def.qty,
      rate: def.rate,
      rate_unit: 'piece',
      due_date: daysFromNow(def.due_days),
      current_stage_id: stageId,
      status: def.stage === 'Dispatched' ? 'dispatched' : 'active',
      created_by: userId,
    }).select().single()
    if (jobErr || !job) continue

    // Initial stage log
    await supabase.from('job_stage_log').insert({
      job_id: job.id, stage_id: stageId, stage_name: stages.find(s => s.id === stageId)?.name ?? '',
      moved_by: userId,
    })

    // At vendor: create subcontract
    if (def.stage === 'At Vendor' && subStage && def.vendor) {
      const vendor = vend(def.vendor)
      if (vendor) {
        const challanRef = await nextChallanRef(unitId)
        await supabase.from('subcontracts').insert({
          job_id: job.id, vendor_id: vendor.id,
          challan_ref: challanRef,
          qty_sent: def.qty,
          operation_desc: `${vendor.work_types?.[0] ?? 'Operation'} — demo`,
          rate_per_piece: Math.round(def.rate * 0.15),
          sent_date: daysFromNow(def.due_days - 7),
          expected_return: daysFromNow(def.due_days),
          status: 'pending',
        })
      }
    }

    // Dispatched: create dispatch record
    if (def.stage === 'Dispatched') {
      const dcNumber = await nextDcNumber(unitId)
      await supabase.from('dispatches').insert({
        job_id: job.id, dc_number: dcNumber,
        qty_dispatched: def.qty,
        dispatch_date: daysFromNow(def.due_days + 2),
        created_by: userId,
      })
    }
  }
}

import { supabase } from './supabase'

export async function nextJobNumber(unitId) {
  const { data } = await supabase
    .from('jobs')
    .select('job_number')
    .eq('unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data?.length) return 'J-001'
  const last = parseInt(data[0].job_number.split('-')[1], 10)
  return `J-${String(last + 1).padStart(3, '0')}`
}

export async function nextChallanRef(unitId) {
  const { data } = await supabase
    .from('subcontracts')
    .select('challan_ref, jobs!inner(unit_id)')
    .eq('jobs.unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data?.length) return 'SC-001'
  const last = parseInt(data[0].challan_ref.split('-')[1], 10)
  return `SC-${String(last + 1).padStart(3, '0')}`
}

export async function nextDcNumber(unitId) {
  const { data } = await supabase
    .from('dispatches')
    .select('dc_number, jobs!inner(unit_id)')
    .eq('jobs.unit_id', unitId)
    .order('created_at', { ascending: false })
    .limit(1)
  if (!data?.length) return 'DC-001'
  const last = parseInt(data[0].dc_number.split('-')[1], 10)
  return `DC-${String(last + 1).padStart(3, '0')}`
}

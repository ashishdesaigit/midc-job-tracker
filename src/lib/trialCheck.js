import { supabase } from './supabase'

// Returns the unit, auto-suspending it if trial has expired.
// Call this after fetching the unit, before routing the user.
export async function checkTrial(unit) {
  if (!unit) return unit
  if (unit.plan !== 'trial') return unit
  if (!unit.trial_ends_at) return unit
  if (unit.is_active === false) return unit          // already suspended
  if (new Date(unit.trial_ends_at) >= new Date()) return unit  // trial still valid

  // Trial expired — auto-suspend
  await supabase.from('units').update({ is_active: false }).eq('id', unit.id)
  return { ...unit, is_active: false }
}

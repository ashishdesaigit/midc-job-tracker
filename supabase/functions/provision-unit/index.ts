// Creates a new unit with default stages + owner auth account.
// Called from /admin when onboarding a new foundry client.
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAGES: Record<string, { name: string; is_subcontract: boolean }[]> = {
  foundry: [
    { name: 'Pattern Check', is_subcontract: false },
    { name: 'Moulding',      is_subcontract: false },
    { name: 'Pouring',       is_subcontract: false },
    { name: 'Shakeout',      is_subcontract: false },
    { name: 'Fettling',      is_subcontract: true  },
    { name: 'Inspection',    is_subcontract: false },
    { name: 'Dispatch',      is_subcontract: false },
  ],
  machine_shop: [
    { name: 'Material Received', is_subcontract: false },
    { name: 'Setup',             is_subcontract: false },
    { name: 'Turning',           is_subcontract: false },
    { name: 'Milling',           is_subcontract: false },
    { name: 'Drilling',          is_subcontract: false },
    { name: 'Inspection',        is_subcontract: false },
    { name: 'Dispatch',          is_subcontract: false },
  ],
  combined: [
    { name: 'Pattern Check', is_subcontract: false },
    { name: 'Moulding',      is_subcontract: false },
    { name: 'Pouring',       is_subcontract: false },
    { name: 'Fettling',      is_subcontract: false },
    { name: 'Turning',       is_subcontract: false },
    { name: 'Milling',       is_subcontract: false },
    { name: 'Inspection',    is_subcontract: false },
    { name: 'Dispatch',      is_subcontract: false },
  ],
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { unit_name, unit_type, owner_name, owner_phone, owner_password, address, gstin } =
      await req.json()

    if (!unit_name || !unit_type || !owner_name || !owner_phone || !owner_password) {
      return json({ error: 'Missing required fields' }, 400)
    }

    const phone = owner_phone.replace(/\D/g, '')
    if (phone.length !== 10) return json({ error: 'Invalid phone number — must be 10 digits' }, 400)

    // 1. Create unit
    const { data: unit, error: unitErr } = await admin.from('units').insert({
      name: unit_name.trim(),
      type: unit_type,
      owner_name: owner_name.trim(),
      address: address?.trim() || null,
      gstin: gstin?.trim() || null,
    }).select().single()
    if (unitErr) return json({ error: unitErr.message }, 400)

    // 2. Insert default stages
    const stages = (STAGES[unit_type] ?? STAGES.foundry).map((s, i) => ({
      unit_id: unit.id, name: s.name, order_index: i, is_subcontract: s.is_subcontract,
    }))
    await admin.from('stage_templates').insert(stages)

    // 3. Create owner auth user
    const { data: authData, error: authErr } = await admin.auth.admin.createUser({
      email: `${phone}@jobtrack.app`,
      password: owner_password,
      email_confirm: true,
      user_metadata: { phone, name: owner_name.trim() },
    })
    if (authErr) {
      await admin.from('units').delete().eq('id', unit.id)
      return json({ error: authErr.message }, 400)
    }

    // 4. Create users record
    const { error: userErr } = await admin.from('users').insert({
      id: authData.user.id,
      unit_id: unit.id,
      name: owner_name.trim(),
      role: 'owner',
      phone,
      is_active: true,
    })
    if (userErr) {
      await admin.auth.admin.deleteUser(authData.user.id)
      await admin.from('units').delete().eq('id', unit.id)
      return json({ error: userErr.message }, 400)
    }

    return json({ unit_id: unit.id })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}
